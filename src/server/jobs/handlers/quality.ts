/**
 * Quality handler — the worker half of "Run quality".
 * Checks run against the real generated files on disk and are persisted as
 * TestRecord rows (with real statuses and failure messages). With
 * `FLEET_SANDBOX=local` the TESTS task actually runs `vitest` in the sandbox and
 * derives the records from its real JSON results; otherwise (and for the other
 * check types) they are deterministic evaluations of the generated files.
 */

import prisma from "@/lib/prisma";
import { aiService } from "@/server/ai";
import type { QualityCheckResult } from "@/server/ai/types";
import type { Prisma } from "@prisma/client";
import { emptySpec, loadBlueprintContext, loadDesign, loadGeneratedFiles } from "../context";
import { writeWorkspaceFile } from "../workspace";
import { hasInstalledTool, previewOutput, runWorkspaceCommand, sandboxEnabled } from "../sandbox";
import type { ClaimedRun } from "../queue";
import { HandlerError, type RunOutcome } from "./shared";

const TESTS_TIMEOUT_MS = 120_000;
const MAX_TEST_RECORDS = 60;

export async function handleQualityCheck(run: ClaimedRun): Promise<RunOutcome> {
  const project = await prisma.project.findUnique({
    where: { id: run.projectId },
    select: { name: true },
  });
  if (!project) throw new HandlerError("PROJECT_NOT_FOUND", "The project no longer exists.");

  const files = await loadGeneratedFiles(run.projectId);
  if (files.length === 0) {
    throw new HandlerError(
      "NO_GENERATED_FILES",
      "Quality checks require generated files. Run the build first."
    );
  }

  const blueprint = await loadBlueprintContext(run.projectId, { approvedOnly: true });
  const design = await loadDesign(run.projectId);

  const startedAt = Date.now();

  let provider: NonNullable<RunOutcome["provider"]>;
  let checks: QualityCheckResult[] | null = null;

  // TESTS runs for real when vitest is installed in the sandbox; the
  // deterministic evaluation is the fallback for every other case.
  const real =
    run.taskType === "TESTS" && sandboxEnabled() && hasInstalledTool(run.projectId, "vitest")
      ? await runRealTests(run)
      : null;

  if (real) {
    provider = { name: "vitest", model: "local", external: false };
    checks = real;
  } else {
    const evaluation = await aiService.evaluateQuality({
      projectId: run.projectId,
      projectName: project.name,
      taskType: run.taskType,
      blueprint: blueprint?.spec ?? emptySpec(),
      design,
      files: files.map((f) => ({ filePath: f.filePath, type: f.type, content: f.content })),
    });
    provider = evaluation.provider;
    checks = evaluation.value;
  }
  const elapsed = Date.now() - startedAt;

  if (checks.length === 0) {
    throw new HandlerError(
      "NO_CHECKS_PRODUCED",
      `The ${run.taskType} check produced no results.`
    );
  }

  await prisma.testRecord.createMany({
    data: checks.map((check) => ({
      projectId: run.projectId,
      testType: check.testType,
      name: check.name,
      status: check.status,
      commandRef: check.commandRef,
      durationMs: check.durationMs > 0 ? check.durationMs : elapsed,
      errorMessage: check.errorMessage,
      completedAt: new Date(),
    })),
  });

  const passed = checks.filter((c) => c.status === "PASSED").length;
  const report = [
    `# ${run.taskType} quality check — ${project.name}`,
    `Checks: ${checks.length}`,
    `Passed: ${passed}`,
    `Failed: ${checks.length - passed}`,
    "",
    ...checks.map(
      (c) => `- [${c.status}] ${c.name}${c.errorMessage ? ` — ${c.errorMessage}` : ""}`
    ),
  ].join("\n");

  const written = await writeWorkspaceFile(
    run.projectId,
    `reports/quality-${run.taskType.toLowerCase()}.log`,
    report
  );
  const artifact = await prisma.projectArtifact.create({
    data: {
      projectId: run.projectId,
      type: "QUALITY_REPORT",
      version: 1,
      filePath: `reports/quality-${run.taskType.toLowerCase()}.log`,
      contentRef: written.ref,
      checksum: written.checksum,
      createdBy: run.userId,
      metadataJson: {
        taskType: run.taskType,
        passed,
        failed: checks.length - passed,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    provider,
    outputArtifactIds: [artifact.id],
    message: `${passed}/${checks.length} checks passed.`,
  };
}

interface VitestJson {
  numTotalTestSuites?: number;
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  testResults?: Array<{
    testFilePath?: string;
    status: string;
    assertionResults?: Array<{
      fullName?: string;
      title?: string;
      status?: string;
      duration?: number;
      failureMessages?: string[];
    }>;
  }>;
}

function parseVitestJson(stdout: string): VitestJson | null {
  const input = String(stdout);
  const start = input.indexOf("{");
  if (start === -1) return null;

  // Scan from the first brace with string-awareness so nested braces (and any
  // `}` inside a failure-message string) never truncate the document.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(input.slice(start, i + 1)) as VitestJson;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function runRealTests(run: ClaimedRun): Promise<QualityCheckResult[]> {
  const result = await runWorkspaceCommand(run.projectId, "npx", ["vitest", "run", "--reporter=json"], TESTS_TIMEOUT_MS);

  const json = parseVitestJson(result.stdout);
  if (!json) {
    if (result.timedOut) {
      return [
        {
          testType: "TESTS",
          name: "vitest run",
          status: "FAILED",
          commandRef: "vitest run --reporter=json",
          durationMs: result.durationMs,
          errorMessage: `vitest timed out after ${Math.floor(TESTS_TIMEOUT_MS / 1000)}s.`,
        },
      ];
    }
    return [
      {
        testType: "TESTS",
        name: "vitest run",
        status: "FAILED",
        commandRef: "vitest run --reporter=json",
        durationMs: result.durationMs,
        errorMessage: `vitest exited with code ${result.code ?? "unknown"} — ${previewOutput(result.stderr || result.stdout)}`,
      },
    ];
  }

  const suites = json.testResults ?? [];
  const checks: QualityCheckResult[] = [];
  let recorded = 0;

  for (const suite of suites) {
    if (recorded >= MAX_TEST_RECORDS) break;
    const suiteName = (suite.assertionResults?.[0]?.fullName ?? suite.status ?? "suite")
      .split(" > ")[0]
      .slice(0, 120);
    const assertions = suite.assertionResults ?? [];
    const failures = assertions.filter((a) => a.status === "failed");
    const pending = assertions.filter((a) => a.status === "pending" || a.status === "skipped");

    if (suite.status === "passed" || (assertions.length > 0 && failures.length === 0)) {
      if (recorded >= MAX_TEST_RECORDS) break;
      checks.push({
        testType: "TESTS",
        name: suiteName || "passed suite",
        status: "PASSED",
        commandRef: "vitest run --reporter=json",
        durationMs: assertions.reduce((sum, a) => sum + (a.duration ?? 0), 0),
        errorMessage: null,
      });
      recorded += 1;
    } else {
      for (const failure of failures) {
        if (recorded >= MAX_TEST_RECORDS) break;
        checks.push({
          testType: "TESTS",
          name: (failure.fullName ?? "failed test").slice(0, 200),
          status: "FAILED",
          commandRef: "vitest run --reporter=json",
          durationMs: failure.duration ?? 0,
          errorMessage:
            (failure.failureMessages?.[0] ?? "Test failed (see vitest output).")
              .replace(/\x1b\[[0-9;]*m/g, "")
              .slice(0, 600) || "Test failed (see vitest output).",
        });
        recorded += 1;
      }
      for (const pendingCheck of pending) {
        if (recorded >= MAX_TEST_RECORDS) break;
        checks.push({
          testType: "TESTS",
          name: (pendingCheck.fullName ?? "skipped test").slice(0, 200),
          status: "SKIPPED",
          commandRef: "vitest run --reporter=json",
          durationMs: 0,
          errorMessage: null,
        });
        recorded += 1;
      }
    }
  }

  if (checks.length === 0) {
    checks.push({
      testType: "TESTS",
      name: "vitest run",
      status: json.numTotalTests === 0 ? "SKIPPED" : "PASSED",
      commandRef: "vitest run --reporter=json",
      durationMs: result.durationMs,
      errorMessage: json.numTotalTests === 0 ? "No tests were discovered." : null,
    });
  }

  return checks;
}
