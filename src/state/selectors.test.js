import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  agendaFor,
  conflictsFor,
  dailyCompletion,
  dashboardStats,
  eventsOn,
  focusGoal,
  focusMinutesOn,
  isDueToday,
  isOverdue,
  openTasks,
  overlaps,
  rangeStats,
  resolveRange,
  taskCountsByPriority,
  taskCountsByStatus,
  upcomingTasks,
} from './selectors.js';
import { buildInitialState } from './reducer.js';
import { addDays } from '../utils/dates.js';

const TODAY = '2026-06-14';

const ID = (n) => `id-0000000-${n}`;

function task(id, overrides = {}) {
  return {
    id,
    title: `Task ${id}`,
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

function event(id, overrides = {}) {
  return {
    id,
    title: `Event ${id}`,
    description: '',
    date: TODAY,
    start: '09:00',
    end: '10:00',
    category: 'Work',
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('task predicates', () => {
  it('flags overdue only for open tasks past their due date', () => {
    expect(isOverdue(task(ID(1), { dueDate: addDays(TODAY, -1) }))).toBe(true);
    expect(isOverdue(task(ID(2), { dueDate: TODAY }))).toBe(false);
    expect(isOverdue(task(ID(3), { dueDate: addDays(TODAY, -1), status: 'Completed' }))).toBe(false);
  });

  it('flags tasks due today and excludes completed ones from open tasks', () => {
    expect(isDueToday(task(ID(1), { dueDate: TODAY }))).toBe(true);
    const state = buildInitialState({
      tasks: [task(ID(1)), task(ID(2), { status: 'Completed' })],
    });
    expect(openTasks(state)).toHaveLength(1);
  });
});

describe('overlaps / conflictsFor — boundary-exclusive', () => {
  it('treats intervals that only touch at a boundary as non-conflicting', () => {
    expect(overlaps('09:00', '10:00', '10:00', '11:00')).toBe(false);
    expect(overlaps('09:00', '10:00', '09:30', '10:30')).toBe(true);
    expect(overlaps('09:00', '10:00', '08:00', '09:00')).toBe(false);
  });

  it('finds real conflicts and can exclude a given event', () => {
    const state = buildInitialState({ events: [event(ID(1)), event(ID(2), { start: '09:30', end: '10:30' })] });
    const conflicts = conflictsFor(state, { date: TODAY, start: '09:45', end: '10:15' });
    expect(conflicts.map((e) => e.id).sort()).toEqual([ID(1), ID(2)].sort());

    const excluded = conflictsFor(state, { date: TODAY, start: '09:45', end: '10:15', excludeId: ID(1) });
    expect(excluded.map((e) => e.id)).toEqual([ID(2)]);
  });

  it('ignores events on other dates', () => {
    const state = buildInitialState({ events: [event(ID(1), { date: addDays(TODAY, 1) })] });
    expect(conflictsFor(state, { date: TODAY, start: '09:00', end: '11:00' })).toHaveLength(0);
  });
});

describe('agendaFor', () => {
  it('merges events and task deadlines, sorting timed items and separating all-day ones', () => {
    const state = buildInitialState({
      events: [event(ID(1), { start: '14:00', end: '15:00' })],
      tasks: [
        task(ID(2), { dueDate: TODAY, dueTime: '09:00', priority: 'High' }),
        task(ID(3), { dueDate: TODAY }), // no time → all-day
        task(ID(4), { dueDate: TODAY, status: 'Completed' }), // excluded
      ],
    });
    const agenda = agendaFor(state, TODAY);
    expect(agenda.events).toHaveLength(1);
    expect(agenda.allDay.map((i) => i.id)).toEqual([ID(3)]);
    expect(agenda.timed.map((i) => i.kind)).toEqual(['task', 'event']);
    expect(agenda.timed[0].id).toBe(ID(2));
  });

  it('returns empty collections for a date with nothing scheduled', () => {
    const agenda = agendaFor(buildInitialState(), addDays(TODAY, 3));
    expect(agenda.items).toEqual([]);
    expect(eventsOn(buildInitialState(), TODAY)).toEqual([]);
  });
});

describe('resolveRange', () => {
  it('builds inclusive ranges ending today', () => {
    expect(resolveRange('7d')).toEqual({ from: addDays(TODAY, -6), to: TODAY });
    expect(resolveRange('30d')).toEqual({ from: addDays(TODAY, -29), to: TODAY });
    expect(resolveRange('90d')).toEqual({ from: addDays(TODAY, -89), to: TODAY });
    expect(resolveRange('month')).toEqual({ from: '2026-06-01', to: TODAY });
  });

  it('swaps a reversed custom range', () => {
    const result = resolveRange('custom', { from: '2026-06-20', to: '2026-06-10' });
    expect(result).toEqual({ from: '2026-06-10', to: '2026-06-20' });
  });

  it('falls back to the last 7 days for an invalid custom range', () => {
    expect(resolveRange('custom', { from: 'nonsense', to: '' })).toEqual({ from: addDays(TODAY, -6), to: TODAY });
  });
});

describe('dashboard stats', () => {
  it('derives open/due/overdue counts and daily completion from records', () => {
    const state = buildInitialState({
      tasks: [
        task(ID(1), { dueDate: TODAY }),
        task(ID(2), { dueDate: addDays(TODAY, -1) }),
        task(ID(3), { status: 'Completed', completedAt: Date.now(), dueDate: TODAY }),
      ],
      habits: [
        {
          id: ID(4),
          name: 'Read',
          schedule: 'daily',
          createdAt: '2026-01-01',
          archived: false,
        },
      ],
      habitLogs: [{ id: ID(5), habitId: ID(4), date: TODAY }],
    });
    const stats = dashboardStats(state);
    expect(stats.tasks.open).toBe(2);
    expect(stats.tasks.overdue).toBe(1);
    // "Due today" counts every task dated today, including the completed one.
    expect(stats.tasks.dueToday).toBe(2);
    expect(stats.tasks.doneToday).toBe(1);
    expect(stats.habits.total).toBe(1);
    expect(stats.habits.done).toBe(1);

    // Plan = tasks due today/overdue (3) + habits scheduled today (1) = 4; done = 1 task + 1 habit.
    const completion = dailyCompletion(state);
    expect(completion.total).toBe(4);
    expect(completion.done).toBe(2);
    expect(completion.value).toBe(50);
  });

  it('reports a null completion value when there is nothing planned', () => {
    const completion = dailyCompletion(buildInitialState());
    expect(completion.value).toBeNull();
  });
});

describe('focus selectors', () => {
  it('sums only focus sessions for the day', () => {
    const state = buildInitialState({
      sessions: [
        { id: ID(1), type: 'focus', date: TODAY, minutes: 25, startedAt: 1, endedAt: 2, taskId: null },
        { id: ID(2), type: 'short', date: TODAY, minutes: 5, startedAt: 1, endedAt: 2, taskId: null },
        { id: ID(3), type: 'focus', date: addDays(TODAY, -1), minutes: 50, startedAt: 1, endedAt: 2, taskId: null },
      ],
    });
    expect(focusMinutesOn(state, TODAY)).toBe(25);
    const goal = focusGoal(state);
    expect(goal.minutes).toBe(25);
    expect(goal.goal).toBeGreaterThan(0);
    expect(goal.percent).toBeLessThanOrEqual(100);
  });
});

describe('task count selectors', () => {
  it('groups by status (all tasks) and priority (open only)', () => {
    const state = buildInitialState({
      tasks: [
        task(ID(1), { status: 'To Do', priority: 'High' }),
        task(ID(2), { status: 'Completed', priority: 'High' }),
        task(ID(3), { status: 'In Progress', priority: 'Low' }),
      ],
    });
    const status = taskCountsByStatus(state);
    expect(status.find((s) => s.name === 'Completed').value).toBe(1);
    const priority = taskCountsByPriority(state);
    expect(priority.find((p) => p.name === 'High').value).toBe(1); // completed High excluded
    expect(priority.find((p) => p.name === 'Low').value).toBe(1);
  });
});

describe('rangeStats', () => {
  it('aggregates completions, focus and habits within the range', () => {
    const state = buildInitialState({
      tasks: [
        task(ID(1), { status: 'Completed', completedAt: new Date(`${TODAY}T10:00:00`).getTime() }),
        task(ID(2), { status: 'Completed', completedAt: new Date(`${addDays(TODAY, -20)}T10:00:00`).getTime() }),
      ],
      sessions: [{ id: ID(3), type: 'focus', date: TODAY, minutes: 30, startedAt: 1, endedAt: 2, taskId: null }],
    });
    const stats = rangeStats(state, addDays(TODAY, -6), TODAY);
    expect(stats.completedTasks).toBe(1); // only the in-range one
    expect(stats.focusMinutes).toBe(30);
    expect(stats.focusSessions).toBe(1);
    expect(stats.days).toBe(7);
  });
});

describe('upcomingTasks', () => {
  it('returns open tasks with due dates sorted by date, limited', () => {
    const state = buildInitialState({
      tasks: [
        task(ID(1), { dueDate: addDays(TODAY, 3) }),
        task(ID(2), { dueDate: addDays(TODAY, 1) }),
        task(ID(3), { dueDate: null }),
        task(ID(4), { dueDate: addDays(TODAY, 2), status: 'Completed' }),
      ],
    });
    const upcoming = upcomingTasks(state, 2);
    expect(upcoming.map((t) => t.id)).toEqual([ID(2), ID(1)]);
  });
});
