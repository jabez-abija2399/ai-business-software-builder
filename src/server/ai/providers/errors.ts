/** Shared errors for provider adapters. */

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured (missing its API key).`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderTaskUnsupportedError extends Error {
  constructor(provider: string, task: string) {
    super(`${provider} does not implement ${task}; it is handled deterministically.`);
    this.name = "ProviderTaskUnsupportedError";
  }
}