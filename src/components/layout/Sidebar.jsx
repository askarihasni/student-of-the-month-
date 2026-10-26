import { NavLink } from 'react-router-dom';
import { PanelLeft, Sparkles, X } from 'lucide-react';
import { NAV_ITEMS } from './nav.js';
import { cn } from '../../utils/cn.js';

function Brand({ collapsed }) {
  return (
    <div className={cn('flex items-center gap-2.5', collapsed ? 'justify-center' : 'px-1')}>
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-on-accent shadow-[0_6px_16px_-8px_var(--accent)]"
        aria-hidden="true"
      >
        L
      </span>
      {!collapsed ? (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[0.95rem] font-semibold tracking-tight text-text">LifeOS</span>
          <span className="text-[0.65rem] font-medium tracking-wider text-faint uppercase">personal</span>
        </span>
      ) : null}
    </div>
  );
}

/** Shared navigation list used by the desktop sidebar and the mobile drawer. */
function NavList({ collapsed, onNavigate }) {
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1 px-2">
      {NAV_ITEMS.map(({ to, label, icon: Icon, hint }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
              collapsed && 'justify-center px-0',
              isActive
                ? 'bg-accent-soft text-accent'
                : 'text-muted hover:bg-surface-3 hover:text-text',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {!collapsed ? <span className="truncate">{label}</span> : null}
              {isActive && !collapsed ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              ) : null}
              {isActive && collapsed ? <span className="sr-only">(current)</span> : null}
              {!collapsed && hint ? <span className="sr-only">{hint}</span> : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Sidebar in one of two variants:
 *  - `aside`:  persistent desktop rail (collapsible to icons)
 *  - `drawer`: mobile overlay panel
 */
export default function Sidebar({ collapsed = false, onToggleCollapse, variant = 'aside', onClose }) {
  if (variant === 'drawer') {
    return (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div className="fade-in absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />
        <div
          className="slide-up absolute inset-y-0 left-0 flex w-[264px] max-w-[85vw] flex-col border-r border-line bg-surface py-4"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose?.();
          }}
        >
          <div className="mb-4 flex items-center justify-between px-4">
            <Brand collapsed={false} />
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Close navigation menu">
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <NavList collapsed={false} onNavigate={onClose} />
          </div>
          <p className="mt-4 px-5 text-[0.7rem] text-faint">LifeOS v1.0 — data stored locally</p>
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <div className={cn('flex h-16 items-center', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
        <Brand collapsed={collapsed} />
        {!collapsed ? (
          <button
            type="button"
            className="btn-icon-sm"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex-1 overflow-y-auto scrollbar-thin">
        <NavList collapsed={collapsed} />
      </div>

      {collapsed ? (
        <button
          type="button"
          className="btn-icon mx-auto mb-3"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <div className="m-3 rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Local-first
          </div>
          <p className="mt-1 text-[0.7rem] leading-relaxed text-muted">
            Everything lives in your browser. Export a backup from Settings.
          </p>
        </div>
      )}
    </aside>
  );
}
