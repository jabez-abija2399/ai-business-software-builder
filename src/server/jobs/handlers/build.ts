/**
 * Build handlers — the worker half of "Start build".
 *
 * Generation tasks produce real files (written to the workspace and recorded as
 * ProjectArtifact rows). The tooling tasks run real, local checks against those
 * files: RUN_TYPECHECK uses the TypeScript parser, RUN_LINT applies deterministic
 * rules. INSTALL_DEPENDENCIES needs a network-enabled sandbox that this
 * environment does not provide, so it fails with an explicit reason instead of
 * pretending to install.
 */

import * as ts from "typescript";
import prisma from "@/lib/prisma";
import { aiService } from "@/server/ai";
import type { Prisma } from "@prisma/client";
import { loadBlueprintContext, loadDesign, loadGeneratedFiles } from "../context";
import { writeWorkspaceFile } from "../workspace";
import type { ClaimedRun } from "../queue";
import { HandlerError, type RunOutcome } from "./shared";

const CHECK_TASKS = new Set(["INSTALL_DEPENDENCIES", "RUN_LINT", "RUN_TYPECHECK"]);

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
    throw new HandlerError(
      "SANDBOX_UNAVAILABLE",
      "Dependency installation needs a network-enabled sandbox that is not available in this environment. Generated package.json is recorded as an artifact instead."
    );
  }

  if (run.taskType === "RUN_TYPECHECK") {
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
