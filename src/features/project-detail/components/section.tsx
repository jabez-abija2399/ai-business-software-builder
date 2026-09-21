import { cn } from "@/lib/utils";

export function SectionBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function SectionBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}