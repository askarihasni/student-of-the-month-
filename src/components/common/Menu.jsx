import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * Dropdown menu.
 *
 * Render-prop trigger receives `{ toggle, open, ref }`; the caller spreads them
 * onto its button so the accessible `aria-expanded` / `aria-haspopup` wiring is
 * automatic. Closes on Escape, outside click and item selection; supports
 * arrow-key navigation between items.
 */
export default function Menu({ trigger, children, align = 'end', className }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        const btn = wrapperRef.current?.querySelector('button');
        btn?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const onMenuKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...(wrapperRef.current?.querySelectorAll('[role="menuitem"]') || [])];
    if (!items.length) return;
    e.preventDefault();
    const index = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next].focus();
  };

  return (
    <div ref={wrapperRef} className={cn('relative inline-block', className)}>
      {trigger({
        open,
        ref: wrapperRef,
        toggle: () => setOpen((v) => !v),
        props: { 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': open ? id : undefined },
      })}
      {open ? (
        <div
          id={id}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className={cn(
            'fade-in absolute z-40 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({ children, onClick, icon: Icon, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-muted hover:bg-surface-3 hover:text-text',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function MenuLabel({ children }) {
  return <div className="px-2.5 py-1.5 text-[0.6875rem] font-semibold tracking-wider text-faint uppercase">{children}</div>;
}

export function MenuSeparator() {
  return <div className="my-1 border-t border-line" role="separator" />;
}
