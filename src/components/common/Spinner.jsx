import { cn } from '../../utils/cn.js';

export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent', className)}
    />
  );
}

/** Skeleton block for loading states. */
export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-3', className)} aria-hidden="true" />;
}

export function CardSkeleton({ rows = 3 }) {
  return (
    <div className="card p-4" aria-hidden="true">
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-full" />
        ))}
      </div>
    </div>
  );
}
