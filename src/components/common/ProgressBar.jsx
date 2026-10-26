import { cn } from '../../utils/cn.js';

/**
 * Determinate progress bar. `value` accepts 0–100 or `null` (no measurable
 * progress yet — the caller renders an explanatory label instead).
 */
export default function ProgressBar({ value, tone = 'accent', label, showValue = true, className, height }) {
  const clamped = value == null ? null : Math.max(0, Math.min(100, value));
  const toneClass =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'danger'
          ? 'bg-danger'
          : 'bg-accent';

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
          {label ? <span className="font-medium text-muted">{label}</span> : <span />}
          {showValue ? (
            <span className="tabular-nums font-semibold text-text">
              {clamped == null ? '—' : `${Math.round(clamped)}%`}
            </span>
          ) : null}
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full bg-surface-3"
        style={{ height: height || 6 }}
        role="progressbar"
        aria-valuenow={clamped ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', toneClass)}
          style={{ width: clamped == null ? '0%' : `${clamped}%` }}
        />
      </div>
    </div>
  );
}
