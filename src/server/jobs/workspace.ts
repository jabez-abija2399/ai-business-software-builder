/**
 * Workspace file store for the worker's sandbox (docs/ARCHITECTURE.md §7).
 *
 * Generated files are written under a per-project directory so they can be
 * inspected, checked and served. The root is configurable via
 * `FLEET_WORKSPACE_DIR` and is gitignored; it is never served statically.
 */

import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export function workspaceRoot(): string {
  return path.resolve(process.env.FLEET_WORKSPACE_DIR?.trim() || ".fleet-workspace");
}

/** Normalises a relative path, rejecting traversal and absolute paths. */
function safeRelative(relPath: string): string {
  const cleaned = relPath
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  if (!cleaned) throw new Error(`Invalid workspace path: ${relPath}`);
  return cleaned;
}

export function projectDir(projectId: string): string {
  return path.join(workspaceRoot(), safeRelative(projectId));
}

export function resolveWorkspacePath(projectId: string, relPath: string): string {
  return path.join(projectDir(projectId), safeRelative(relPath));
}

export interface WrittenFile {
  ref: string;
  absolutePath: string;
  checksum: string;
  bytes: number;
}

export async function writeWorkspaceFile(
  projectId: string,
  relPath: string,
  content: string
): Promise<WrittenFile> {
  const ref = safeRelative(relPath);
  const absolutePath = path.join(projectDir(projectId), ref);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  return {
    ref,
    absolutePath,
    checksum: createHash("sha256").update(content).digest("hex").slice(0, 16),
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

export async function readWorkspaceFile(projectId: string, ref: string): Promise<string | null> {
  try {
    return await readFile(resolveWorkspacePath(projectId, ref), "utf8");
  } catch {
    return null;
  }
}
