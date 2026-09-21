import { SectionBlock, SectionHeader } from "./section";
import { formatCompactNumber, formatMilliseconds, formatMoney } from "../lib/format";
import type { ModelActivity, ProviderActivity } from "../types";
import { cn } from "@/lib/utils";

function ProviderRow({ item }: { item: ProviderActivity }) {
  const status = item.errors > 0 ? "degraded" : "healthy";
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/60">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium">{item.provider}</span>
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              status === "healthy" ? "bg-success" : "bg-destructive"
            )}
            aria-hidden
          />
        </div>
        <div className="text-[11px] text-muted-foreground">
          {status === "healthy" ? "Healthy" : `${item.errors} failed`}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-semibold tabular-nums">
          {formatCompactNumber(item.requests)}
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {formatMoney(item.cost)}
        </div>
      </div>
    </div>
  );
}

function ModelRow({ item }: { item: ModelActivity }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/60">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium">{item.model}</div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {formatMilliseconds(item.latencyMs)} avg
        </div>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-semibold tabular-nums">
          {formatCompactNumber(item.requests)}
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {formatMoney(item.cost)}
        </div>
      </div>
    </div>
  );
}

export function ProjectActivityColumns({
  providers,
  models,
  isEmpty,
}: {
  providers: ProviderActivity[];
  models: ModelActivity[];
  isEmpty: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionBlock>
        <div className="px-5 pt-5">
          <SectionHeader
            title="Providers"
            description="AI providers used by recent runs"
          />
        </div>
        <div className="px-5 pb-2 pt-1">
          {isEmpty ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              No provider activity recorded yet.
            </p>
          ) : providers.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              Runs haven&apos;t recorded a provider yet.
            </p>
          ) : (
            providers.map((p) => <ProviderRow key={p.provider} item={p} />)
          )}
        </div>
      </SectionBlock>

      <SectionBlock>
        <div className="px-5 pt-5">
          <SectionHeader
            title="Top models"
            description="Most-used models across recent runs"
          />
        </div>
        <div className="px-5 pb-2 pt-1">
          {isEmpty ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              No model activity recorded yet.
            </p>
          ) : models.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              Runs haven&apos;t recorded a model yet.
            </p>
          ) : (
            models.slice(0, 6).map((m) => <ModelRow key={m.model} item={m} />)
          )}
        </div>
      </SectionBlock>
    </div>
  );
}