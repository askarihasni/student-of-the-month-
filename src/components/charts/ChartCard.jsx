import { cn } from '../../utils/cn.js';

/** Card wrapper that keeps every chart visually consistent. */
export default function ChartCard({ title, subtitle, action, children, className, bodyClassName }) {
  return (
    <section className={cn('card p-4 sm:p-5', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="section-title">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      )}
      <div className={cn('min-w-0', bodyClassName)}>{children}</div>
    </section>
  );
}
