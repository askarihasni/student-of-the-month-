import { initialTimer } from '../utils/timer.js';
import { DEFAULT_PREFS, DEFAULT_DASHBOARD, WIDGET_IDS, STATUSES } from '../data/defaults.js';

/**
 * Single application reducer.
 *
 * Every module (tasks, habits, calendar, focus, goals) writes to the same
 * state tree so any change is immediately visible to the dashboard, calendar
 * and analytics — there is no page-local copy of any record.
 *
 * Undo/redo keeps snapshots of the record collections only (never timers,
 * preferences or toasts) so undoing can never corrupt unrelated state or IDs.
 */

const RECORD_SECTIONS = ['tasks', 'habits', 'habitLogs', 'events', 'sessions', 'goals'];

const UNDOABLE = new Set([
  'TASK_ADD', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_SET_STATUS',
  'HABIT_ADD', 'HABIT_UPDATE', 'HABIT_SET_ARCHIVED', 'HABIT_DELETE',
  'HABIT_LOG_TOGGLE',
  'EVENT_ADD', 'EVENT_UPDATE', 'EVENT_DELETE',
  'SESSION_DELETE',
  'GOAL_ADD', 'GOAL_UPDATE', 'GOAL_DELETE',
  'MILESTONE_ADD', 'MILESTONE_UPDATE', 'MILESTONE_DELETE', 'MILESTONE_TOGGLE',
]);

const HISTORY_LIMIT = 50;

function snapshot(state) {
  const out = {};
  for (const key of RECORD_SECTIONS) out[key] = state[key];
  return out;
}

function sanitizeLayout(order, hidden) {
  const known = WIDGET_IDS;
  const safeOrder = Array.isArray(order) ? known.filter((id) => order.includes(id)) : [...DEFAULT_DASHBOARD.order];
  const safeHidden = Array.isArray(hidden) ? hidden.filter((id) => known.includes(id)) : [];
  return { order: safeOrder, hidden: safeHidden };
}

/* ------------------------------------------------------------------ */
/* Section reducers                                                    */
/* ------------------------------------------------------------------ */

function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'TASK_ADD': {
      const t = action.task;
      if (!t || !t.id || !t.title?.trim()) return tasks;
      return [t, ...tasks];
    }
    case 'TASK_UPDATE':
      return tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch, id: t.id } : t));
    case 'TASK_DELETE':
      return tasks.filter((t) => t.id !== action.id);
    case 'TASK_SET_STATUS':
      return tasks.map((t) => {
        if (t.id !== action.id) return t;
        const next = STATUSES.includes(action.status) ? action.status : t.status;
        if (next === t.status) return t;
        const wasCompleted = t.status === 'Completed';
        const isCompleted = next === 'Completed';
        if (wasCompleted && isCompleted) return t;
        return { ...t, status: next, completedAt: isCompleted ? (action.at ?? Date.now()) : null };
      });
    default:
      return tasks;
  }
}

function habitsReducer(habits, action) {
  switch (action.type) {
    case 'HABIT_ADD':
      return action.habit && action.habit.id ? [action.habit, ...habits] : habits;
    case 'HABIT_UPDATE':
      return habits.map((h) => (h.id === action.id ? { ...h, ...action.patch, id: h.id } : h));
    case 'HABIT_SET_ARCHIVED':
      return habits.map((h) => (h.id === action.id ? { ...h, archived: !!action.archived } : h));
    case 'HABIT_DELETE':
      return habits.filter((h) => h.id !== action.id);
    default:
      return habits;
  }
}

function habitLogsReducer(logs, action) {
  switch (action.type) {
    case 'HABIT_LOG_TOGGLE': {
      const exists = logs.some((l) => l.habitId === action.habitId && l.date === action.date);
      if (exists) return logs.filter((l) => !(l.habitId === action.habitId && l.date === action.date));
      if (!action.logId) return logs;
      return [...logs, { id: action.logId, habitId: action.habitId, date: action.date }];
    }
    case 'HABIT_DELETE':
      return logs.filter((l) => l.habitId !== action.id);
    default:
      return logs;
  }
}

function eventsReducer(events, action) {
  switch (action.type) {
    case 'EVENT_ADD':
      return action.event && action.event.id ? [...events, action.event] : events;
    case 'EVENT_UPDATE':
      return events.map((e) => (e.id === action.id ? { ...e, ...action.patch, id: e.id } : e));
    case 'EVENT_DELETE':
      return events.filter((e) => e.id !== action.id);
    default:
      return events;
  }
}

function sessionsReducer(sessions, action) {
  switch (action.type) {
    case 'SESSION_ADD':
      if (!action.session?.id || sessions.some((s) => s.id === action.session.id)) return sessions;
      return [action.session, ...sessions];
    case 'SESSION_DELETE':
      return sessions.filter((s) => s.id !== action.id);
    case 'TASK_DELETE':
      return sessions.map((s) => (s.taskId === action.id ? { ...s, taskId: null } : s));
    default:
      return sessions;
  }
}

function goalsReducer(goals, action) {
  switch (action.type) {
    case 'GOAL_ADD':
      return action.goal && action.goal.id ? [action.goal, ...goals] : goals;
    case 'GOAL_UPDATE':
      return goals.map((g) => (g.id === action.id ? { ...g, ...action.patch, id: g.id } : g));
    case 'GOAL_DELETE':
      return goals.filter((g) => g.id !== action.id);
    case 'MILESTONE_ADD':
      return goals.map((g) =>
        g.id === action.goalId && action.milestone?.id
          ? { ...g, milestones: [...g.milestones, action.milestone] }
          : g,
      );
    case 'MILESTONE_UPDATE':
      return goals.map((g) =>
        g.id === action.goalId
          ? { ...g, milestones: g.milestones.map((m) => (m.id === action.id ? { ...m, ...action.patch, id: m.id } : m)) }
          : g,
      );
    case 'MILESTONE_DELETE':
      return goals.map((g) =>
        g.id === action.goalId ? { ...g, milestones: g.milestones.filter((m) => m.id !== action.id) } : g,
      );
    case 'MILESTONE_TOGGLE':
      return goals.map((g) =>
        g.id === action.goalId
          ? { ...g, milestones: g.milestones.map((m) => (m.id === action.id ? { ...m, done: !m.done } : m)) }
          : g,
      );
    default:
      return goals;
  }
}

function prefsReducer(prefs, action) {
  switch (action.type) {
    case 'PREFS_UPDATE':
      return { ...prefs, ...action.patch };
    case 'THEME_SET':
      return { ...prefs, theme: action.theme === 'light' ? 'light' : 'dark' };
    default:
      return prefs;
  }
}

function dashboardReducer(dashboard, action) {
  switch (action.type) {
    case 'DASH_SET_LAYOUT':
      return sanitizeLayout(action.order, action.hidden);
    case 'DASH_RESET':
      return { order: [...DEFAULT_DASHBOARD.order], hidden: [] };
    default:
      return dashboard;
  }
}

function timerReducer(timer, action) {
  const now = action.at ?? Date.now();
  switch (action.type) {
    case 'TIMER_START':
      return {
        ...timer,
        status: 'running',
        sessionType: action.sessionType ?? timer.sessionType,
        durationMs: action.durationMs ?? timer.durationMs,
        elapsedMs: 0,
        startedAt: now,
        sessionId: action.sessionId,
        taskId: action.taskId ?? null,
        completedAt: null,
        completedSessionId: null,
      };
    case 'TIMER_PAUSE':
      if (timer.status !== 'running') return timer;
      return {
        ...timer,
        status: 'paused',
        elapsedMs: timer.elapsedMs + Math.max(0, now - (timer.startedAt ?? now)),
        startedAt: null,
      };
    case 'TIMER_RESUME':
      if (timer.status !== 'paused') return timer;
      return { ...timer, status: 'running', startedAt: now };
    case 'TIMER_RESET':
      return {
        ...initialTimer(),
        sessionType: action.sessionType ?? timer.sessionType,
        durationMs: action.durationMs ?? timer.durationMs,
        taskId: action.taskId ?? timer.taskId,
      };
    case 'TIMER_CONFIG':
      // Configure durations while the timer is not mid-run.
      if (timer.status === 'running') return timer;
      return {
        ...timer,
        sessionType: action.sessionType ?? timer.sessionType,
        durationMs: action.durationMs ?? timer.durationMs,
        elapsedMs: timer.status === 'completed' ? 0 : timer.elapsedMs,
        status: timer.status === 'completed' ? 'idle' : timer.status,
      };
    case 'TIMER_SET_TASK':
      return { ...timer, taskId: action.taskId ?? null };
    case 'TASK_DELETE':
      return timer.taskId === action.id ? { ...timer, taskId: null } : timer;
    default:
      return timer;
  }
}

/* ------------------------------------------------------------------ */
/* Root reducer                                                        */
/* ------------------------------------------------------------------ */

export function rootReducer(state, action) {
  switch (action.type) {
    case 'STATE_IMPORT':
    case 'STATE_RESET':
      return {
        ...state,
        ...action.data,
        past: [],
        future: [],
      };

    case 'UNDO': {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        ...previous,
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future].slice(0, HISTORY_LIMIT),
      };
    }

    case 'REDO': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        ...state,
        ...next,
        past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }

    case 'TIMER_COMPLETE': {
      const t = state.timer;
      // Duplicate-completion guards:
      //  1. the session id must match the attempt currently in the timer
      //  2. an already completed attempt is never completed again
      //  3. a session record with this id is never created twice
      if (t.sessionId !== action.sessionId) return state;
      if (t.status === 'completed' && t.completedSessionId === action.sessionId) return state;
      if (t.status === 'idle') return state;

      const completedTimer = {
        ...t,
        status: 'completed',
        elapsedMs: t.durationMs,
        startedAt: null,
        completedAt: action.at ?? Date.now(),
        completedSessionId: action.sessionId,
      };

      let sessions = state.sessions;
      if (t.sessionType === 'focus' && !sessions.some((s) => s.id === action.sessionId)) {
        const endedAt = action.at ?? Date.now();
        sessions = [
          {
            id: action.sessionId,
            type: 'focus',
            date: toDateStrLocal(endedAt),
            startedAt: t.startedAt ?? endedAt - t.durationMs,
            endedAt,
            minutes: Math.max(1, Math.round(t.durationMs / 60000)),
            taskId: t.taskId ?? null,
          },
          ...sessions,
        ];
      }
      return { ...state, timer: completedTimer, sessions };
    }

    default:
      break;
  }

  const next = {
    tasks: tasksReducer(state.tasks, action),
    habits: habitsReducer(state.habits, action),
    habitLogs: habitLogsReducer(state.habitLogs, action),
    events: eventsReducer(state.events, action),
    sessions: sessionsReducer(state.sessions, action),
    goals: goalsReducer(state.goals, action),
    prefs: prefsReducer(state.prefs, action),
    timer: timerReducer(state.timer, action),
    dashboard: dashboardReducer(state.dashboard, action),
  };

  let changed = false;
  for (const key of Object.keys(next)) {
    if (next[key] !== state[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return state;

  if (UNDOABLE.has(action.type)) {
    return {
      ...next,
      past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
      future: [],
    };
  }
  return { ...next, past: state.past, future: state.future };
}

/** Local `YYYY-MM-DD` for an epoch timestamp (used when creating sessions). */
function toDateStrLocal(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ------------------------------------------------------------------ */
/* Initial state                                                       */
/* ------------------------------------------------------------------ */

export function buildInitialState(data) {
  const base = data || {};
  return {
    tasks: base.tasks ?? [],
    habits: base.habits ?? [],
    habitLogs: base.habitLogs ?? [],
    events: base.events ?? [],
    sessions: base.sessions ?? [],
    goals: base.goals ?? [],
    prefs: { ...DEFAULT_PREFS, ...(base.prefs ?? {}) },
    timer: { ...initialTimer(), ...(base.timer ?? {}) },
    dashboard: sanitizeLayout(base.dashboard?.order, base.dashboard?.hidden),
    past: [],
    future: [],
  };
}

/** Strip non-persistable bookkeeping before writing to storage / backup. */
export function serializeState(state) {
  const { past, future, ...rest } = state;
  void past;
  void future;
  return rest;
}
