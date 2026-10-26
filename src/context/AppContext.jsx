import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { rootReducer, buildInitialState, serializeState } from '../state/reducer.js';
import { STORAGE_KEY, THEME_KEY } from '../data/defaults.js';
import { readJSON, writeJSON } from '../utils/storage.js';
import { sanitizeState } from '../utils/backup.js';
import { createSampleData } from '../data/sampleData.js';
import { isTimerDone } from '../utils/timer.js';
import { createId } from '../utils/id.js';
import { playChime } from '../utils/sound.js';

/* eslint-disable react-refresh/only-export-components -- the provider and its
   `useApp` hook intentionally live together so consumers import a single module. */

/**
 * One store for the whole app.
 *
 * - State is loaded once: saved data (validated/sanitized) or sample data on a
 *   genuine first launch.
 * - Every dispatch is persisted (undo bookkeeping stripped).
 * - A single watcher completes a running focus timer exactly once, even when
 *   the tab was backgrounded or the page was refreshed mid-session.
 */

const AppContext = createContext(null);

function loadInitialState() {
  const saved = readJSON(STORAGE_KEY, null);
  if (saved == null) {
    // First launch: seed realistic sample records.
    return buildInitialState(createSampleData());
  }
  return buildInitialState(sanitizeState(saved));
}

const isEditableTarget = (target) => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute?.('role') === 'textbox'
  );
};

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, loadInitialState);
  const [toasts, setToasts] = useState([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const timersRef = useRef(new Map());

  /* ---------------------------- persistence --------------------------- */
  useEffect(() => {
    writeJSON(STORAGE_KEY, serializeState(state));
  }, [state]);

  /* ------------------------------- theme ------------------------------ */
  const theme = state.prefs.theme === 'light' ? 'light' : 'dark';
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    writeJSON(THEME_KEY, theme);
  }, [theme]);

  /* ------------------------------ toasts ------------------------------ */
  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const handle = timersRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message, type = 'success') => {
      const id = createId();
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      const handle = setTimeout(() => {
        setToasts((list) => list.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, 4500);
      timersRef.current.set(id, handle);
    },
    [],
  );

  useEffect(() => {
    const map = timersRef.current;
    return () => {
      for (const handle of map.values()) clearTimeout(handle);
      map.clear();
    };
  }, []);

  /* --------------------------- timer watcher -------------------------- */
  const timerRef = useRef(state.timer);
  timerRef.current = state.timer;
  const lastStatusRef = useRef(state.timer.status);

  useEffect(() => {
    if (state.timer.status !== 'running') return undefined;

    const check = () => {
      const t = timerRef.current;
      if (t.status === 'running' && t.sessionId && isTimerDone(t)) {
        dispatch({ type: 'TIMER_COMPLETE', sessionId: t.sessionId, at: Date.now() });
      }
    };

    check(); // completes a restored timer that elapsed while the app was closed
    const interval = setInterval(check, 400);
    return () => clearInterval(interval);
  }, [state.timer.status, state.timer.sessionId]);

  // Completion feedback (fires once per transition to `completed`).
  useEffect(() => {
    const prev = lastStatusRef.current;
    lastStatusRef.current = state.timer.status;
    if (prev !== 'running' || state.timer.status !== 'completed') return;
    const wasFocus = state.timer.sessionType === 'focus';
    playChime(state.prefs.soundEnabled);
    toast(wasFocus ? 'Focus session complete — nice work.' : 'Break is over.', 'success');
  }, [state.timer.status, state.timer.sessionType, state.prefs.soundEnabled, toast]);

  /* --------------------------- undo / redo ---------------------------- */
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        // Let native undo/redo work inside editable controls.
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        if (key === 'y' || e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  /* ----------------------- command palette shortcut -------------------- */
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      toasts,
      toast,
      dismissToast,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      paletteOpen,
      setPaletteOpen,
    }),
    [state, toasts, toast, dismissToast, undo, redo, paletteOpen],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
