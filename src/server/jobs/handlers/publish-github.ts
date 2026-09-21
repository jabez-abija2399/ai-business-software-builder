/**
 * GitHub publish handler — the worker half of "Publish to GitHub".
 *
 * Reads the real generated files from the workspace and pushes them to a
 * GitHub repository using the Git Data API (blobs → tree → commit → ref).
 * Nothing is fabricated: the repo URL, branch and commit sha are the real
 * values GitHub returns, and the whole run fails honestly if any source file is
 * no longer on disk.
 */

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { readWorkspaceFile, writeWorkspaceFile } from "../workspace";
import {
  createBlob,
  createCommit,
  createRepository,
  createTree,
  defaultBranchSha,
  ensureRefOnBranch,
  getAuthenticatedUser,
  getRepository,
  githubConfig,
  seedRepository,
  GitHubError,
} from "@/server/github/client";
import type { ClaimedRun } from "../queue";
import { HandlerError, type RunOutcome } from "./shared";

const SOURCE_TYPES = ["SOURCE_FILE", "SCHEMA", "TEST", "STYLE", "DOC"];
const REPORT_TYPES = ["BUILD_LOG", "QUALITY_REPORT"];

function slugifyRepo(input: string): string {
  const slug = String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "app";
}

/** Latest artifact per path, oldest versions dropped (mirrors the code screen). */
async function loadPublishableFiles(projectId: string) {
  const artifacts = await prisma.projectArtifact.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, type: true, filePath: true, contentRef: true },
  });

  const seen = new Set<string>();
  const entries: Array<{ path: string; type: string; content: string | null }> = [];
  for (const artifact of artifacts) {
    if (seen.has(artifact.filePath)) continue;
    seen.add(artifact.filePath);
    const isSource = SOURCE_TYPES.includes(artifact.type);
    const isReport = REPORT_TYPES.includes(artifact.type);
    if (!isSource && !isReport) continue;

    const content = await readWorkspaceFile(projectId, artifact.contentRef);
    if (isReport && content === null) continue;
    if (isSource && content === null) {
      throw new HandlerError(
        "FILE_CONTENT_MISSING",
        `${artifact.filePath} is no longer on the worker sandbox, so it cannot be published. Re-run the build first.`
      );
    }
    entries.push({
      path: isReport ? `.fleet/reports/${artifact.filePath.split("/").pop()}` : artifact.filePath,
      type: artifact.type,
      content,
    });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export async function handlePublishGitHub(run: ClaimedRun): Promise<RunOutcome> {
  const project = await prisma.project.findUnique({
    where: { id: run.projectId },
    select: { name: true },
  });
  if (!project) throw new HandlerError("PROJECT_NOT_FOUND", "The project no longer exists.");

  const config = githubConfig();
  if (!config.token) {
    throw new HandlerError(
      "GITHUB_NOT_CONFIGURED",
      "GitHub publishing is not configured. Set GITHUB_TOKEN in the server environment (gitignored) to enable it."
    );
  }

  const owner = config.owner ?? (await getAuthenticatedUser(config.token));
  const repoName = `${config.repoPrefix}-${slugifyRepo(project.name)}`;
  const branch = "main";

  const entries = await loadPublishableFiles(run.projectId);
  if (entries.length === 0) {
    throw new HandlerError(
      "NO_GENERATED_FILES",
      "No generated files are available to publish. Run the build first."
    );
  }

  // Create (or reuse) a genuinely existing repository. A brand-new repo has no
  // commits, so seed its default branch first — GitHub rejects Git Data API
  // writes into an empty repository (409 "Git Repository is empty.").
  const existing = await getRepository(config.token, owner, repoName);
  const repo =
    existing ??
    (await createRepository(config.token, owner, repoName, config.privateRepo));
  const baseSha = existing
    ? await defaultBranchSha(config.token, owner, repoName, branch)
    : await seedRepository(config.token, owner, repoName, branch);
  if (!baseSha) {
    throw new HandlerError(
      "NO_DEFAULT_BRANCH",
      `${owner}/${repoName} has no ${branch} branch, so the publish could not be committed.`
    );
  }

  // Upload real file contents as blobs (batched), then tree → commit → ref.
  const shas = new Map<string, string>();
  const batchSize = 99;
  for (let i = 0; i < entries.length; i += batchSize) {
    const slice = entries.slice(i, i + batchSize);
    await Promise.all(
      slice.map(async (entry) => {
        if (entry.content === null) return;
        const sha = await createBlob(config.token!, owner, repoName, entry.content);
        shas.set(entry.path, sha);
      })
    );
  }

  const treeEntries = Array.from(shas, ([path, sha]) => ({ path, sha }));
  const treeSha = await createTree(config.token, owner, repoName, baseSha, treeEntries);
  const commitSha = await createCommit(
    config.token,
    owner,
    repoName,
    treeSha,
    baseSha ? [baseSha] : [],
    `fleet: publish "${project.name}" (${entries.length} file(s))`
  );
  await ensureRefOnBranch(config.token, owner, repoName, branch, commitSha);

  const publishedAt = new Date().toISOString();
  const report = [
    `# GitHub publish — ${project.name}`,
    `repo: ${owner}/${repoName}`,
    `url: ${repo.htmlUrl}`,
    `branch: ${branch}`,
    `commit: ${commitSha}`,
    `files: ${entries.length}`,
    `published_at: ${publishedAt}`,
    "",
    entries.map((e) => `- ${e.path}`).join("\n"),
  ].join("\n");

  const written = await writeWorkspaceFile(run.projectId, "reports/publish-github.log", report);
  const artifact = await prisma.projectArtifact.create({
    data: {
      projectId: run.projectId,
      type: "BUILD_LOG",
      version: 1,
      filePath: "reports/publish-github.log",
      contentRef: written.ref,
      checksum: written.checksum,
      createdBy: run.userId,
      metadataJson: {
        bytes: written.bytes,
        app: "github",
        commitSha,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    provider: { name: "github", model: "rest-git-data", external: true },
    outputArtifactIds: [artifact.id],
    message: `Published ${entries.length} file(s) to ${owner}/${repoName} (commit ${commitSha.slice(0, 7)}).`,
  };
}

export { GitHubError };