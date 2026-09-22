/**
 * Analytics service (docs/ARCHITECTURE.md §2 — "one tool per responsibility").
 *
 * Server-side product analytics are pushed behind a small service interface.
 * Today the only provider is PostHog, activated when `POSTHOG_API_KEY` is set;
 * without a key the service is an honest no-op — it never fabricates events,
 * never blocks a request, and never throws.
 *
 * The `/usage` dashboard is first-party: it reads real rows from the database
 * and does not depend on this service at all.
 */

import { PostHog } from "posthog-node";

const API_KEY = process.env.POSTHOG_API_KEY?.trim();
const HOST = process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

const client: PostHog | null = API_KEY ? new PostHog(API_KEY, { host: HOST }) : null;

export function isAnalyticsConfigured(): boolean {
  return client !== null;
}

export type AnalyticsEventName =
  | "sign_in"
  | "project_created"
  | "blueprint_approved"
  | "design_generated"
  | "build_started"
  | "quality_run_started"
  | "review_run_started"
  | "preview_created"
  | "deploy_created"
  | "run_finished";

/**
 * Fire-and-forget server-side event. Never blocks the request and never logs a
 * failure — analytics must never take the product down.
 */
export function trackAnalytics(
  event: AnalyticsEventName,
  options: { distinctId: string; properties?: Record<string, unknown> }
): void {
  if (!client) return;
  try {
    client.capture({
      distinctId: options.distinctId,
      event,
      properties: {
        $current_url: "server",
        ...(options.properties ?? {}),
      },
      timestamp: new Date(),
    });
  } catch {
    // Analytics must be invisible to product behavior.
  }
}

/** Flushes buffered events. Safe to await at shutdown; no-ops when disabled. */
export function flushAnalytics(): void {
  if (!client) return;
  try {
    void client.flush();
  } catch {
    // Best-effort final flush.
  }
}

/** Sentry-style rate-logged confirmation that the hook is wired (Never the event itself). */
export function analyticsStatus(): { configured: boolean } {
  return { configured: client !== null };
}