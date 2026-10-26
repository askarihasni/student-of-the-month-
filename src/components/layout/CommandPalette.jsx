import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  CirclePlus,
  Command,
  Download,
  Moon,
  Redo2,
  Search,
  Sun,
  Timer,
  Undo2,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { NAV_ITEMS } from './nav.js';
import { triggerBackupDownload } from '../../utils/backup.js';
import { cn } from '../../utils/cn.js';

/**
 * Ctrl/Cmd + K command palette (bonus feature C).
 * Searches navigation destinations and app actions, supports arrow-key
 * selection, Enter to run and Escape to close. The global shortcut never
 * intercepts typing because it only fires for the accelerator itself, and the
 * palette input owns focus while open.
 */
export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen, state, dispatch, canUndo, canRedo, toast } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const commands = useMemo(() => {
    const nav = NAV_ITEMS.map((item) => ({
      id: `nav-${item.to}`,
      group: 'Navigate',
      label: `Go to ${item.label}`,
      hint: item.hint,
      icon: item.icon,
      keywords: `go open ${item.label} ${item.hint}`.toLowerCase(),
      run: () => navigate(item.to),
    }));

    const actions = [
      {
        id: 'act-task',
        group: 'Actions',
        label: 'Create a new task',
        icon: CirclePlus,
        keywords: 'add new task todo create',
        run: () => navigate('/tasks?new=1'),
      },
      {
        id: 'act-habit',
        group: 'Actions',
        label: 'Create a new habit',
        icon: CirclePlus,
        keywords: 'add new habit routine create',
        run: () => navigate('/habits?new=1'),
      },
      {
        id: 'act-event',
        group: 'Actions',
        label: 'Schedule an event',
        icon: CalendarPlus,
        keywords: 'add new event meeting calendar schedule',
        run: () => navigate('/calendar?new=1'),
      },
      {
        id: 'act-goal',
        group: 'Actions',
        label: 'Create a new goal',
        icon: CirclePlus,
        keywords: 'add new goal milestone create',
        run: () => navigate('/goals?new=1'),
      },
      {
        id: 'act-focus',
        group: 'Actions',
        label: 'Open the focus timer',
        icon: Timer,
        keywords: 'start pomodoro focus timer session',
        run: () => navigate('/focus'),
      },
      {
        id: 'act-theme',
        group: 'Actions',
        label: state.prefs.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode',
        icon: state.prefs.theme === 'light' ? Moon : Sun,
        keywords: 'theme dark light appearance toggle mode',
        run: () => {
          dispatch({ type: 'THEME_SET', theme: state.prefs.theme === 'light' ? 'dark' : 'light' });
          toast('Theme updated.', 'info');
        },
      },
      {
        id: 'act-export',
        group: 'Actions',
        label: 'Export JSON backup now',
        icon: Download,
        keywords: 'export backup download json save data',
        run: () => {
          const ok = triggerBackupDownload(state);
          toast(ok ? 'Backup downloaded.' : 'Could not start the download.', ok ? 'success' : 'error');
        },
      },
      {
        id: 'act-dashboard',
        group: 'Actions',
        label: 'Restore default dashboard layout',
        icon: RotateCcw,
        keywords: 'dashboard widgets reset layout restore default',
        run: () => {
          dispatch({ type: 'DASH_RESET' });
          toast('Dashboard layout restored to defaults.', 'success');
        },
      },
      {
        id: 'act-undo',
        group: 'History',
        label: 'Undo last change',
        icon: Undo2,
        disabled: !canUndo,
        keywords: 'undo back revert ctrl+z',
        run: () => dispatch({ type: 'UNDO' }),
      },
      {
        id: 'act-redo',
        group: 'History',
        label: 'Redo change',
        icon: Redo2,
        disabled: !canRedo,
        keywords: 'redo forward ctrl+shift+z',
        run: () => dispatch({ type: 'REDO' }),
      },
    ];

    return [...nav, ...actions];
  }, [navigate, dispatch, state, canUndo, canRedo, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords && c.keywords.includes(q)),
    );
  }, [commands, query]);

  // Reset when opened / close cleanly.
  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [paletteOpen]);

  useEffect(() => {
    if (!paletteOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPaletteOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen, setPaletteOpen]);

  // Keep the highlighted row in view.
  useEffect(() => {
    const node = listRef.current?.querySelector('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, filtered.length]);

  if (!paletteOpen) return null;

  const runCommand = (cmd) => {
    if (!cmd || cmd.disabled) return;
    setPaletteOpen(false);
    cmd.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(filtered[active]);
    }
  };

  let lastGroup = null;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
      <div className="fade-in fixed inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setPaletteOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="slide-up relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="h-12 w-full bg-transparent text-sm text-text outline-none placeholder:text-faint"
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-autocomplete="list"
            aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
            aria-label="Command search"
          />
          <kbd className="hidden rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-medium text-faint sm:block">
            esc
          </kbd>
        </div>

        <div id="command-list" role="listbox" aria-label="Commands" ref={listRef} className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">No commands match “{query}”.</p>
          ) : (
            filtered.map((cmd, index) => {
              const showGroup = cmd.group !== lastGroup;
              lastGroup = cmd.group;
              const Icon = cmd.icon;
              return (
                <div key={cmd.id}>
                  {showGroup ? (
                    <div className="px-2.5 pt-2 pb-1 text-[0.65rem] font-semibold tracking-wider text-faint uppercase">
                      {cmd.group}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    id={`cmd-${cmd.id}`}
                    role="option"
                    aria-selected={index === active}
                    data-active={index === active}
                    disabled={cmd.disabled}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => runCommand(cmd)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      index === active ? 'bg-accent-soft text-text' : 'text-muted',
                      cmd.disabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {Icon ? <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> : null}
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {index === active ? <Command className="h-3.5 w-3.5 text-faint" aria-hidden="true" /> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[0.7rem] text-faint">
          <span>
            <kbd className="font-medium">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-medium">↵</kbd> run
          </span>
          <span>
            <kbd className="font-medium">esc</kbd> close
          </span>
          <span className="ml-auto">{`${filtered.length} command${filtered.length === 1 ? '' : 's'}`}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
