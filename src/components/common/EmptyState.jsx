import { cn } from '../../utils/cn.js';

/** Consistent empty / no-results state with an optional call to action. */
export default function EmptyState({ icon: Icon, title, description, action, compact = false, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2/60 text-center',
        compact ? 'px-4 py-8' : 'px-6 py-12',
        className,
      )}
    >
      {Icon ? (
        <span
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-muted"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
