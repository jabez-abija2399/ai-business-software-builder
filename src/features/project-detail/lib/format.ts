/** Formats raw numbers used across the Overview without ambiguous notation. */

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.01 && value !== 0) {
    return `< $0.01`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 10 ? 2 : 0,
    maximumFractionDigits: value < 10 ? 2 : 0,
  }).format(value);
}

export function formatMilliseconds(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export function formatPercentDelta(
  value: number | null | undefined,
  { invertSign = false } = {}
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = invertSign ? value * -1 : value;
  const abs = Math.abs(sign);
  const label = sign >= 0 ? "up" : "down";
  return `${label} ${abs.toFixed(1)}%`;
}

export function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const seconds = Math.round((Date.now() - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 minute ago";
  if (seconds < 3_600) return `${Math.round(seconds / 60)} minutes ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3_600)}h ago`;
  return `${Math.round(seconds / 86_400)}d ago`;
}

export function formatUpdatedAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3_600)}h ago`;
}