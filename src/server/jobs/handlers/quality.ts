/**
 * Quality handler — the worker half of "Run quality".
 * Checks run against the real generated files on disk and are persisted as
 * TestRecord rows (with real statuses and failure messages).
 */

import prisma from "@/lib/prisma";
import { aiService } from "@/server/ai";
import type { Prisma } from "@prisma/client";
import { emptySpec, loadBlueprintContext, loadDesign, loadGeneratedFiles } from "../context";
import { writeWorkspaceFile } from "../workspace";
import type { ClaimedRun } from "../queue";
import { HandlerError, type RunOutcome } from "./shared";

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
  const { provider, value: checks } = await aiService.evaluateQuality({
    projectId: run.projectId,
    projectName: project.name,
    taskType: run.taskType,
    blueprint: blueprint?.spec ?? emptySpec(),
    design,
    files: files.map((f) => ({ filePath: f.filePath, type: f.type, content: f.content })),
  });
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
