/**
 * Robust JSON extraction from model output. Models asked for JSON sometimes
 * wrap it in fenced code blocks or add prose; we strip fences and take the
 * outermost balanced object before parsing, so a single parser works for every
 * provider regardless of whether it supports `response_format`.
 */

export function extractJson<T>(content: string): T {
  let candidate = content.trim().replace(/^```(?:json)?/i, "").replace(/```/i, "").trim();

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    candidate = candidate.slice(start, end + 1);
  }

  return JSON.parse(candidate) as T;
}