import { ChevronDown, ChevronUp, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * Standard dashboard widget chrome.
 * While customising the dashboard (bonus A) the shell adds hide / move
 * controls so widgets can be rearranged without drag-only interactions.
 */
export default function WidgetShell({
  id,
  title,
  subtitle,
  actions,
  editing = false,
  onHide,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  children,
  className,
  bodyClassName,
}) {
  return (
    <section
      id={`widget-${id}`}
      className={cn('card flex min-w-0 flex-col p-4 sm:p-5', className)}
      aria-label={title}
    >
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                type="button"
                className="btn-icon-sm border border-line disabled:opacity-30"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                aria-label={`Move ${title} up`}
                title="Move up"
              >
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn-icon-sm border border-line disabled:opacity-30"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                aria-label={`Move ${title} down`}
                title="Move down"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn-icon-sm border border-line text-danger hover:bg-danger-soft"
                onClick={onHide}
                aria-label={`Hide ${title} widget`}
                title="Hide widget"
              >
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : null}
          {actions && !editing ? <div className="flex items-center gap-1">{actions}</div> : null}
        </div>
      </div>

      <div className={cn('min-w-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}
