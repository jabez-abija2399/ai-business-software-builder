/**
 * Local sandbox for real command execution inside a project workspace
 * (docs/ARCHITECTURE.md §7).
 *
 * Enabled by setting `FLEET_SANDBOX=local` (the .env file is gitignored, so each
 * environment opts in explicitly). When disabled, the handlers keep failing
 * honestly with `SANDBOX_UNAVAILABLE` instead of pretending to install.
 * Commands run with the project workspace as their working directory and are
 * isolated by timeout + output cap; results (exit code, stdout/stderr tail) are
 * persisted as real reports, never fabricated.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { projectDir } from "./workspace";

export type SandboxMode = "none" | "local";

export function sandboxMode(): SandboxMode {
  const value = (process.env.FLEET_SANDBOX ?? "none").trim().toLowerCase();
  return value === "local" ? "local" : "none";
}

export function sandboxEnabled(): boolean {
  return sandboxMode() === "local";
}

export interface CommandResult {
  ok: boolean;
  timedOut: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

const OUTPUT_CAP = 200_000;

/** Runs `command` inside the project's workspace, streams/tails output, and
 *  always resolves — the caller decides how to report the outcome. */
export function runWorkspaceCommand(
  projectId: string,
  command: string,
  args: string[],
  timeoutMs: number
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let timedOut = false;
    let stdout = "";
    let stderr = "";

    const child = spawn(command, args, {
      cwd: projectDir(projectId),
      shell: false,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        npm_config_update_notifier: "false",
        CI: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > OUTPUT_CAP) stdout = stdout.slice(-OUTPUT_CAP);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > OUTPUT_CAP) stderr = stderr.slice(-OUTPUT_CAP);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        timedOut,
        code: null,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        durationMs: Date.now() - startedAt,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: !timedOut && code === 0,
        timedOut,
        code,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

/** True when a tool is actually installed in the project's node_modules. */
export function hasInstalledTool(projectId: string, binName: string): boolean {
  return existsSync(path.join(projectDir(projectId), "node_modules", ".bin", binName));
}

/** Collapses an output tail into a short, actionable inline message. */
export function previewOutput(output: string, max = 600): string {
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  const tail = lines.slice(-3).join(" | ");
  return tail.slice(0, max) || "no output";
}