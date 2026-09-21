import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercentDelta } from "../lib/format";

export function MetricCard({
  label,
  value,
  delta,
  invertDelta = false,
  hint,
  tabular = false,
}: {
  label: string;
  value: string;
  delta?: number | null;
  /** When true a negative change is "good" (latency, error rate). */
  invertDelta?: boolean;
  hint?: string;
  tabular?: boolean;
}) {
  const deltaText = formatPercentDelta(delta, { invertSign: invertDelta });
  const isPositive = delta != null && Number(delta) >= 0;
  const isGood = deltaText == null ? null : invertDelta ? isPositive === false : isPositive;

  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
        {deltaText && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium tabular-nums",
              isGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {Number(delta) >= 0 ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            )}
            {isGood === null && <Minus className="h-3 w-3" aria-hidden />}
            {deltaText.replace(/^(up|down) /, "")}%
          </span>
        )}
      </div>
      <div
        className={cn(
          "whitespace-nowrap text-[24px] font-semibold leading-none tracking-tight tabular-nums",
          tabular && "font-mono text-[22px]"
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}