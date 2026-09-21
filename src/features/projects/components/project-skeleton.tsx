import { Skeleton } from "@/components/ui/skeleton";

/**
 * Row-shaped skeleton matching the real project row layout so the first paint
 * feels stable instead of spinner-only.
 */
export function ProjectListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="pt-8" aria-hidden>
      <Skeleton className="mb-3 h-4 w-24 bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5"
          >
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-[60%]" />
              <Skeleton className="h-3 w-64 max-w-[80%]" />
            </div>
            <div className="hidden items-center gap-6 lg:flex">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="ml-2 flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}