/**
 * Worker process entry point.
 *
 *   npm run worker        # poll forever
 *   npm run worker:once   # drain the queue, then exit
 */

import { runWorker } from "@/server/jobs/worker";

const once = process.argv.includes("--once") || process.env.WORKER_ONCE === "1";

runWorker({ once }).catch((error) => {
  console.error("[worker] fatal error:", error);
  process.exitCode = 1;
});
