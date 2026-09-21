import type { Prisma } from "@prisma/client";
import type { ProviderInfo } from "@/server/ai/types";

/** A handler failure with a stable machine code for the AgentRun. */
export class HandlerError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "HandlerError";
    this.code = code;
  }
}

export interface RunOutcome {
  provider?: ProviderInfo;
  outputArtifactIds?: string[];
  tokenUsage?: Prisma.InputJsonValue;
  message?: string;
}
