import { cn } from '../../utils/cn.js';

/**
 * Segmented control (radiogroup). Used for view switches such as
 * List / Kanban or Day / Week.
 */
export default function Segmented({ options, value, onChange, size = 'md', className, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'bg-surface text-text shadow-sm ring-1 ring-line-strong'
                : 'text-muted hover:text-text',
            )}
          >
            {opt.icon ? <opt.icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
