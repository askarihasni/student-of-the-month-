import { Menu as MenuIcon, Moon, Redo2, Search, Sun, Undo2, Command } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { NAV_ITEMS } from './nav.js';
import Menu, { MenuItem, MenuLabel, MenuSeparator } from '../common/Menu.jsx';
import { formatLongDate, todayStr } from '../../utils/dates.js';
import { useNavigate } from 'react-router-dom';

/** Top bar: date, command palette entry, theme toggle and preferences menu. */
export default function Topbar({ onOpenDrawer }) {
  const { state, dispatch, undo, redo, canUndo, canRedo, setPaletteOpen, toast } = useApp();
  const navigate = useNavigate();
  const isDark = state.prefs.theme !== 'light';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    dispatch({ type: 'THEME_SET', theme: next });
    toast(`Switched to ${next} mode.`, 'info');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        className="btn-icon lg:hidden"
        onClick={onOpenDrawer}
        aria-label="Open navigation menu"
      >
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <p className="hidden min-w-0 truncate text-sm font-medium text-muted md:block">
        <time dateTime={todayStr()}>{formatLongDate(todayStr())}</time>
      </p>

      {/* Global search / command palette trigger */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="group mx-auto hidden h-9 w-full max-w-sm cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-sm text-faint transition-colors hover:border-line-strong hover:text-muted sm:flex"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Search or run a command…</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-medium text-faint lg:flex">
          <Command className="h-3 w-3" aria-hidden="true" />K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          className="btn-icon hidden sm:inline-flex"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette"
          title="Command palette (Ctrl+K)"
        >
          <Search className="h-4.5 w-4.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="btn-icon hidden sm:inline-flex"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo last change"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn-icon hidden sm:inline-flex"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo change"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4.5 w-4.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="btn-icon"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-4.5 w-4.5" aria-hidden="true" /> : <Moon className="h-4.5 w-4.5" aria-hidden="true" />}
        </button>

        <Menu
          align="end"
          trigger={({ toggle, props }) => (
            <button
              type="button"
              onClick={toggle}
              {...props}
              className="ml-1 flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-1.5 transition-colors hover:border-line-strong"
              aria-label="Open profile menu"
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-md bg-accent-soft text-[0.7rem] font-bold text-accent"
                aria-hidden="true"
              >
                LO
              </span>
            </button>
          )}
        >
          {({ close }) => (
            <>
              <MenuLabel>Signed in (local)</MenuLabel>
              <MenuItem
                icon={NAV_ITEMS[7].icon}
                onClick={() => {
                  navigate('/settings');
                  close();
                }}
              >
                Preferences &amp; data
              </MenuItem>
              <MenuItem
                icon={Command}
                onClick={() => {
                  close();
                  setPaletteOpen(true);
                }}
              >
                Command palette
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={isDark ? Sun : Moon} onClick={() => { toggleTheme(); close(); }}>
                {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              </MenuItem>
              <MenuItem
                icon={Undo2}
                disabled={!canUndo}
                onClick={() => {
                  undo();
                  close();
                }}
              >
                Undo last change
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
