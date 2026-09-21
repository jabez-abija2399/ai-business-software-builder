const SKELETON = "rounded-lg bg-muted/70 animate-pulse";

export function ProjectOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading project overview">
      <div className={`${SKELETON} h-14 w-full`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`${SKELETON} h-24`} />
        ))}
      </div>
      <div className={`${SKELETON} h-72 w-full`} />
      <div className={`${SKELETON} h-40 w-full`} />
    </div>
  );
}

export function OverviewInlineSkeleton({ className }: { className?: string }) {
  return <div className={`${SKELETON} ${className ?? "h-16 w-full"}`} />;
}