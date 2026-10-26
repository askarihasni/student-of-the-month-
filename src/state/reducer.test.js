import { describe, expect, it } from 'vitest';
import { buildInitialState, rootReducer, serializeState } from './reducer.js';
import { DEFAULT_PREFS, WIDGET_IDS } from '../data/defaults.js';
import { initialTimer } from '../utils/timer.js';

const ID = (n) => `id-0000000-${n}`;

function emptyState(overrides = {}) {
  return buildInitialState(overrides);
}

function task(id = ID(1), overrides = {}) {
  return {
    id,
    title: 'Task',
    description: '',
    priority: 'Medium',
    dueDate: null,
    dueTime: null,
    category: '',
    estimateMin: null,
    status: 'To Do',
    createdAt: 1_700_000_000_000,
    completedAt: null,
    ...overrides,
  };
}

describe('buildInitialState', () => {
  it('fills defaults and starts with empty history', () => {
    const state = emptyState();
    expect(state.prefs).toEqual(DEFAULT_PREFS);
    expect(state.tasks).toEqual([]);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
    expect(state.dashboard.order).toEqual(WIDGET_IDS);
  });
});

describe('tasks reducer', () => {
  it('adds a task and rejects empty input', () => {
    let state = emptyState();
    state = rootReducer(state, { type: 'TASK_ADD', task: task() });
    expect(state.tasks).toHaveLength(1);

    const before = state.tasks.length;
    state = rootReducer(state, { type: 'TASK_ADD', task: task(ID(2), { title: '   ' }) });
    expect(state.tasks).toHaveLength(before);
  });

  it('sets status and stamps completion time', () => {
    let state = emptyState({ tasks: [task()] });
    state = rootReducer(state, { type: 'TASK_SET_STATUS', id: ID(1), status: 'Completed', at: 42 });
    expect(state.tasks[0].status).toBe('Completed');
    expect(state.tasks[0].completedAt).toBe(42);

    state = rootReducer(state, { type: 'TASK_SET_STATUS', id: ID(1), status: 'To Do', at: 99 });
    expect(state.tasks[0].completedAt).toBeNull();
  });

  it('clears the session links when a task is deleted', () => {
    const session = {
      id: ID(5),
      type: 'focus',
      date: '2026-06-14',
      startedAt: 1,
      endedAt: 2,
      minutes: 1,
      taskId: ID(1),
    };
    let state = emptyState({ tasks: [task()], sessions: [session] });
    state = rootReducer(state, { type: 'TASK_DELETE', id: ID(1) });
    expect(state.tasks).toHaveLength(0);
    expect(state.sessions[0].taskId).toBeNull();
  });
});

describe('habit log toggle', () => {
  it('adds then removes a completion for a (habit, date) pair', () => {
    let state = emptyState();
    state = rootReducer(state, { type: 'HABIT_LOG_TOGGLE', habitId: ID(2), date: '2026-06-14', logId: ID(3) });
    expect(state.habitLogs).toHaveLength(1);

    state = rootReducer(state, { type: 'HABIT_LOG_TOGGLE', habitId: ID(2), date: '2026-06-14' });
    expect(state.habitLogs).toHaveLength(0);
  });
});

describe('goals and milestones', () => {
  it('adds, toggles and deletes milestones', () => {
    const goal = { id: ID(6), title: 'Goal', description: '', targetDate: null, category: '', createdAt: 1, milestones: [] };
    let state = emptyState({ goals: [goal] });
    state = rootReducer(state, {
      type: 'MILESTONE_ADD',
      goalId: ID(6),
      milestone: { id: ID(7), title: 'Step', description: '', done: false },
    });
    expect(state.goals[0].milestones).toHaveLength(1);

    state = rootReducer(state, { type: 'MILESTONE_TOGGLE', goalId: ID(6), id: ID(7) });
    expect(state.goals[0].milestones[0].done).toBe(true);

    state = rootReducer(state, { type: 'MILESTONE_DELETE', goalId: ID(6), id: ID(7) });
    expect(state.goals[0].milestones).toHaveLength(0);
  });
});

describe('undo / redo', () => {
  it('restores record collections after an undoable action', () => {
    let state = emptyState();
    state = rootReducer(state, { type: 'TASK_ADD', task: task() });
    expect(state.past).toHaveLength(1);

    state = rootReducer(state, { type: 'UNDO' });
    expect(state.tasks).toHaveLength(0);
    expect(state.future).toHaveLength(1);

    state = rootReducer(state, { type: 'REDO' });
    expect(state.tasks).toHaveLength(1);
  });

  it('is a no-op when there is nothing to undo', () => {
    const state = emptyState();
    expect(rootReducer(state, { type: 'UNDO' })).toBe(state);
  });

  it('preserves undo bookkeeping across non-undoable actions', () => {
    let state = rootReducer(emptyState(), { type: 'TASK_ADD', task: task() });
    state = rootReducer(state, { type: 'PREFS_UPDATE', patch: { soundEnabled: false } });
    expect(Array.isArray(state.past)).toBe(true);
    expect(Array.isArray(state.future)).toBe(true);
    // Undo still works after the non-undoable action.
    state = rootReducer(state, { type: 'UNDO' });
    expect(state.tasks).toHaveLength(0);
  });
});

describe('timer actions', () => {
  it('starts, pauses, resumes and resets', () => {
    let state = emptyState();
    state = rootReducer(state, {
      type: 'TIMER_START',
      sessionType: 'focus',
      durationMs: 60_000,
      sessionId: ID(9),
      at: 1000,
    });
    expect(state.timer.status).toBe('running');
    expect(state.timer.startedAt).toBe(1000);

    state = rootReducer(state, { type: 'TIMER_PAUSE', at: 31_000 });
    expect(state.timer.status).toBe('paused');
    expect(state.timer.elapsedMs).toBe(30_000);

    state = rootReducer(state, { type: 'TIMER_RESUME', at: 40_000 });
    expect(state.timer.status).toBe('running');
    expect(state.timer.startedAt).toBe(40_000);

    state = rootReducer(state, { type: 'TIMER_RESET' });
    expect(state.timer.status).toBe('idle');
    expect(state.timer.elapsedMs).toBe(0);
  });

  it('completes a focus session exactly once and records one session row', () => {
    let state = emptyState();
    state = rootReducer(state, {
      type: 'TIMER_START',
      sessionType: 'focus',
      durationMs: 60_000,
      sessionId: ID(9),
      at: 1000,
    });
    state = rootReducer(state, { type: 'TIMER_COMPLETE', sessionId: ID(9), at: 61_000 });
    expect(state.timer.status).toBe('completed');
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe(ID(9));

    // Completing again must not add a second session.
    state = rootReducer(state, { type: 'TIMER_COMPLETE', sessionId: ID(9), at: 70_000 });
    expect(state.sessions).toHaveLength(1);
  });

  it('ignores a completion whose session id does not match', () => {
    let state = emptyState();
    state = rootReducer(state, {
      type: 'TIMER_START',
      sessionType: 'focus',
      durationMs: 60_000,
      sessionId: ID(9),
      at: 1000,
    });
    state = rootReducer(state, { type: 'TIMER_COMPLETE', sessionId: ID(999), at: 61_000 });
    expect(state.sessions).toHaveLength(0);
    expect(state.timer.status).toBe('running');
  });

  it('does not record a break session', () => {
    let state = emptyState();
    state = rootReducer(state, {
      type: 'TIMER_START',
      sessionType: 'short',
      durationMs: 60_000,
      sessionId: ID(9),
      at: 1000,
    });
    state = rootReducer(state, { type: 'TIMER_COMPLETE', sessionId: ID(9), at: 61_000 });
    expect(state.sessions).toHaveLength(0);
    expect(state.timer.status).toBe('completed');
  });

  it('clears the timer task link when that task is deleted', () => {
    let state = emptyState({ tasks: [task()] });
    state = rootReducer(state, { type: 'TIMER_SET_TASK', taskId: ID(1) });
    state = rootReducer(state, { type: 'TASK_DELETE', id: ID(1) });
    expect(state.timer.taskId).toBeNull();
  });
});

describe('prefs, theme and dashboard', () => {
  it('updates preferences', () => {
    let state = emptyState();
    state = rootReducer(state, { type: 'PREFS_UPDATE', patch: { focusMinutes: 50 } });
    expect(state.prefs.focusMinutes).toBe(50);
  });

  it('normalises the theme value', () => {
    let state = emptyState();
    state = rootReducer(state, { type: 'THEME_SET', theme: 'light' });
    expect(state.prefs.theme).toBe('light');
    state = rootReducer(state, { type: 'THEME_SET', theme: 'nonsense' });
    expect(state.prefs.theme).toBe('dark');
  });

  it('sanitises dashboard layout and resets to defaults', () => {
    let state = emptyState();
    state = rootReducer(state, {
      type: 'DASH_SET_LAYOUT',
      order: ['agenda', 'summary', 'bogus'],
      hidden: ['agenda', 'also-bogus'],
    });
    expect(state.dashboard.order).toEqual(['summary', 'agenda']);
    expect(state.dashboard.hidden).toEqual(['agenda']);

    state = rootReducer(state, { type: 'DASH_RESET' });
    expect(state.dashboard.order).toEqual(WIDGET_IDS);
    expect(state.dashboard.hidden).toEqual([]);
  });
});

describe('STATE_IMPORT / STATE_RESET', () => {
  it('replaces data atomically and clears history', () => {
    let state = emptyState({ tasks: [task()] });
    state = rootReducer(state, { type: 'TASK_ADD', task: task(ID(2)) });
    state = rootReducer(state, {
      type: 'STATE_IMPORT',
      data: {
        tasks: [task(ID(3), { title: 'Imported' })],
        prefs: { ...DEFAULT_PREFS, theme: 'light' },
        timer: initialTimer(),
      },
    });
    expect(state.tasks.map((t) => t.id)).toEqual([ID(3)]);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
  });
});

describe('serializeState', () => {
  it('strips undo/redo bookkeeping', () => {
    const state = rootReducer(emptyState(), { type: 'TASK_ADD', task: task() });
    const serialized = serializeState(state);
    expect(serialized.past).toBeUndefined();
    expect(serialized.future).toBeUndefined();
    expect(serialized.tasks).toHaveLength(1);
  });
});
