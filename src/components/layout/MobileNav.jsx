import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListChecks, CalendarDays, Timer, Ellipsis } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/focus', label: 'Focus', icon: Timer },
];

/** Mobile bottom navigation with a "More" button that opens the full drawer. */
export default function MobileNav({ onOpenMore }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[0.65rem] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-muted hover:text-text',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMore}
            className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[0.65rem] font-medium text-muted transition-colors hover:text-text"
            aria-label="Open full navigation menu"
          >
            <Ellipsis className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
