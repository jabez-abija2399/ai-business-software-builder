/**
 * Build handlers — the worker half of "Start build".
 *
 * Generation tasks produce real files (written to the workspace and recorded as
 * ProjectArtifact rows). The tooling tasks run real, local checks against those
 * files: with `FLEET_SANDBOX=local` the worker actually runs `npm install`,
 * `tsc --noEmit` and `vitest` inside the sandbox and reports their real output;
 * without it, RUN_TYPECHECK falls back to the TypeScript parser and
 * INSTALL_DEPENDENCIES fails with an explicit reason instead of pretending to
 * install.
 */

import * as ts from "typescript";
import prisma from "@/lib/prisma";
import { aiService } from "@/server/ai";
import type { Prisma } from "@prisma/client";
import { loadBlueprintContext, loadDesign, loadGeneratedFiles } from "../context";
import { writeWorkspaceFile } from "../workspace";
import { hasInstalledTool, previewOutput, runWorkspaceCommand, sandboxEnabled } from "../sandbox";
import type { ClaimedRun } from "../queue";
import { HandlerError, type RunOutcome } from "./shared";

const CHECK_TASKS = new Set(["INSTALL_DEPENDENCIES", "RUN_LINT", "RUN_TYPECHECK"]);
const INSTALL_TIMEOUT_MS = 300_000;
const TYPECHECK_TIMEOUT_MS = 120_000;

export async function handleBuildTask(run: ClaimedRun): Promise<RunOutcome> {
  const project = await prisma.project.findUnique({
    where: { id: run.projectId },
    select: { name: true },
  });
  if (!project) throw new HandlerError("PROJECT_NOT_FOUND", "The project no longer exists.");

  if (CHECK_TASKS.has(run.taskType)) {
    return runBuildCheck(run, project.name);
  }

  const blueprint = await loadBlueprintContext(run.projectId, { approvedOnly: true });
  if (!blueprint) {
    throw new HandlerError(
      "NO_APPROVED_BLUEPRINT",
      "Build requires an approved blueprint."
    );
  }

  const design = await loadDesign(run.projectId);
  const { provider, value: generation } = await aiService.generateCode({
    projectId: run.projectId,
    projectName: project.name,
    blueprint: blueprint.spec,
    design,
    taskType: run.taskType,
  });

  const artifactIds: string[] = [];
  for (const generated of generation.files) {
    const written = await writeWorkspaceFile(run.projectId, generated.filePath, generated.content);
    const artifact = await prisma.projectArtifact.create({
      data: {
        projectId: run.projectId,
        type: generated.type,
        version: 1,
        filePath: generated.filePath,
        contentRef: written.ref,
        checksum: written.checksum,
        createdBy: run.userId,
        metadataJson: {
          bytes: written.bytes,
          generator: provider.name,
          taskType: run.taskType,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    artifactIds.push(artifact.id);
  }

  return {
    provider,
    outputArtifactIds: artifactIds,
    message: generation.summary,
  };
}

async function recordReport(run: ClaimedRun, name: string, content: string): Promise<string> {
  const written = await writeWorkspaceFile(run.projectId, `reports/${name}.log`, content);
  const artifact = await prisma.projectArtifact.create({
    data: {
      projectId: run.projectId,
      type: "BUILD_LOG",
      version: 1,
      filePath: `reports/${name}.log`,
      contentRef: written.ref,
      checksum: written.checksum,
      createdBy: run.userId,
      metadataJson: { bytes: written.bytes, taskType: run.taskType } as unknown as Prisma.InputJsonValue,
    },
  });
  return artifact.id;
}

async function runBuildCheck(run: ClaimedRun, projectName: string): Promise<RunOutcome> {
  const files = await loadGeneratedFiles(run.projectId);
  if (files.length === 0) {
    throw new HandlerError(
      "NO_GENERATED_FILES",
      "No generated files were found, so this check cannot run."
    );
  }

  if (run.taskType === "INSTALL_DEPENDENCIES") {
    if (!sandboxEnabled()) {
      throw new HandlerError(
        "SANDBOX_UNAVAILABLE",
        "Dependency installation needs a local sandbox. Set FLEET_SANDBOX=local (gitignored) to enable real npm installs. Generated package.json is recorded as an artifact instead."
      );
    }
    return runInstall(run, projectName);
  }

  if (run.taskType === "RUN_TYPECHECK") {
    if (sandboxEnabled() && hasInstalledTool(run.projectId, "tsc")) {
      return runRealTypecheck(run, projectName);
    }
    return runParseTypecheck(run, projectName);
  }

  // RUN_LINT — deterministic rules over real generated content.
  const violations: string[] = [];
  for (const source of files) {
    const lines = source.content.split("\n");
    lines.forEach((line, index) => {
      if (/\bconsole\.(log|debug|info)\(/.test(line)) {
        violations.push(`${source.filePath}:${index + 1} console statement`);
      }
      if (/\bdebugger\b/.test(line)) {
        violations.push(`${source.filePath}:${index + 1} debugger statement`);
      }
      if (/:\s*any\b|<any>/.test(line)) {
        violations.push(`${source.filePath}:${index + 1} explicit any`);
      }
      if (/\b(TODO|FIXME)\b/.test(line)) {
        violations.push(`${source.filePath}:${index + 1} unresolved TODO/FIXME`);
      }
    });
  }

  const report = [
    `# Lint — ${projectName}`,
    `Files scanned: ${files.length}`,
    `Violations: ${violations.length}`,
    ...violations.slice(0, 50),
  ].join("\n");
  const artifactId = await recordReport(run, "lint", report);

  if (violations.length > 0) {
    throw new HandlerError(
      "LINT_FAILED",
      `Lint found ${violations.length} violation(s): ${violations.slice(0, 3).join(" | ")}`
    );
  }

  return {
    provider: { name: "fleet-lint", model: "rules-v1", external: false },
    outputArtifactIds: [artifactId],
    message: `Scanned ${files.length} file(s) with no violations.`,
  };
}

/** Real `npm install` against the registry, isolated in the workspace dir. */
async function runInstall(run: ClaimedRun, projectName: string): Promise<RunOutcome> {
  const result = await runWorkspaceCommand(run.projectId, "npm", ["install", "--no-audit", "--no-fund"], INSTALL_TIMEOUT_MS);

  const report = [
    `# npm install — ${projectName}`,
    `exit: ${result.code ?? "n/a"}${result.timedOut ? " (timed out)" : ""}`,
    `duration: ${Math.round(result.durationMs / 1000)}s`,
    "",
    "## stdout",
    result.stdout.slice(-12_000),
    "",
    "## stderr",
    result.stderr.slice(-12_000),
  ].join("\n");
  const artifactId = await recordReport(run, "install", report);

  if (!result.ok) {
    const reason = result.timedOut
      ? `timed out after ${Math.floor(INSTALL_TIMEOUT_MS / 1000)}s`
      : `exited with code ${result.code ?? "unknown"}`;
    throw new HandlerError(
      "NPM_INSTALL_FAILED",
      `npm install ${reason}. ${previewOutput(result.stderr || result.stdout)}`
    );
  }

  const added = result.stdout.match(/added \d+ packages/i)?.[0];
  return {
    provider: { name: "npm", model: "registry", external: false },
    outputArtifactIds: [artifactId],
    message: added
      ? `Installed dependencies from the registry: ${added}.`
      : `Dependencies installed (exit 0, ${Math.round(result.durationMs / 1000)}s).`,
  };
}

/** Real `tsc --noEmit` over the generated project when TypeScript is installed. */
async function runRealTypecheck(run: ClaimedRun, projectName: string): Promise<RunOutcome> {
  const result = await runWorkspaceCommand(run.projectId, "npx", ["tsc", "--noEmit"], TYPECHECK_TIMEOUT_MS);

  const report = [
    `# Typecheck (tsc --noEmit) — ${projectName}`,
    `exit: ${result.code ?? "n/a"}${result.timedOut ? " (timed out)" : ""}`,
    `duration: ${Math.round(result.durationMs / 1000)}s`,
    "",
    "## stdout",
    result.stdout.slice(-12_000),
    "",
    "## stderr",
    result.stderr.slice(-12_000),
  ].join("\n");
  const artifactId = await recordReport(run, "typecheck", report);

  if (result.timedOut) {
    throw new HandlerError("TYPECHECK_FAILED", `tsc --noEmit timed out after ${Math.floor(TYPECHECK_TIMEOUT_MS / 1000)}s.`);
  }
  if (!result.ok) {
    throw new HandlerError("TYPECHECK_FAILED", `tsc --noEmit exited with code ${result.code ?? "unknown"} — ${previewOutput(result.stderr || result.stdout)}`);
  }

  return {
    provider: { name: "typescript", model: ts.version, external: false },
    outputArtifactIds: [artifactId],
    message: `tsc --noEmit passed across the TypeScript project (exit 0).`,
  };
}

/** Parser-based typecheck — the honest fallback when no sandbox is enabled. */
async function runParseTypecheck(run: ClaimedRun, projectName: string): Promise<RunOutcome> {
  const files = await loadGeneratedFiles(run.projectId);
  const problems: string[] = [];
  const sources = files.filter((f) => /\.(ts|tsx)$/.test(f.filePath));
  for (const source of sources) {
    const output = ts.transpileModule(source.content, {
      fileName: source.filePath,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.Preserve,
      },
    });
    for (const diagnostic of output.diagnostics ?? []) {
      if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
      const where = diagnostic.file && diagnostic.start != null
        ? `:${diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1}`
        : "";
      problems.push(`${source.filePath}${where} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
    }
  }

  const report = [
    `# Typecheck — ${projectName}`,
    `Files parsed: ${sources.length}`,
    `Errors: ${problems.length}`,
    ...problems.slice(0, 50),
  ].join("\n");
  const artifactId = await recordReport(run, "typecheck", report);

  if (problems.length > 0) {
    throw new HandlerError(
      "TYPECHECK_FAILED",
      `TypeScript found ${problems.length} error(s): ${problems.slice(0, 3).join(" | ")}`
    );
  }

  return {
    provider: { name: "typescript", model: ts.version, external: false },
    outputArtifactIds: [artifactId],
    message: `Parsed ${sources.length} TypeScript file(s) with no errors.`,
  };
}
