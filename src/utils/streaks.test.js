import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, dayOfWeek } from './dates.js';
import {
  completionRate,
  computeStreaks,
  habitsScheduledOn,
  isCompletedOn,
  isScheduledOn,
} from './streaks.js';

// Pin "today" so streak maths is deterministic. 2026-06-14 is a Sunday.
const TODAY = '2026-06-14';

function log(habitId, date, i = 0) {
  return { id: `log-${habitId}-${date}-${i}`, habitId, date };
}

function habit(overrides = {}) {
  return {
    id: 'habit-1',
    name: 'Read',
    schedule: 'daily',
    createdAt: '2020-01-01',
    archived: false,
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

describe('isScheduledOn', () => {
  it('treats daily and 7-day schedules as every day', () => {
    expect(isScheduledOn(habit({ schedule: 'daily' }), TODAY)).toBe(true);
    expect(isScheduledOn(habit({ schedule: [0, 1, 2, 3, 4, 5, 6] }), TODAY)).toBe(true);
  });

  it('matches custom weekday schedules', () => {
    const sunday = habit({ schedule: [0] });
    expect(dayOfWeek(TODAY)).toBe(0);
    expect(isScheduledOn(sunday, TODAY)).toBe(true);
    expect(isScheduledOn(sunday, addDays(TODAY, 1))).toBe(false);
  });
});

describe('computeStreaks — daily habit', () => {
  it('counts consecutive completed days including today', () => {
    const logs = [log('habit-1', TODAY), log('habit-1', addDays(TODAY, -1)), log('habit-1', addDays(TODAY, -2))];
    expect(computeStreaks(habit(), logs).current).toBe(3);
  });

  it('does not break the streak while today is still pending', () => {
    const logs = [log('habit-1', addDays(TODAY, -1)), log('habit-1', addDays(TODAY, -2))];
    expect(computeStreaks(habit(), logs).current).toBe(2);
  });

  it('breaks the streak on a missed scheduled day', () => {
    // today done, yesterday missed, two days ago done
    const logs = [log('habit-1', TODAY), log('habit-1', addDays(TODAY, -2))];
    expect(computeStreaks(habit(), logs).current).toBe(1);
  });

  it('reports 0 when nothing has ever been completed', () => {
    expect(computeStreaks(habit(), []).current).toBe(0);
  });
});

describe('computeStreaks — rest days (custom schedule)', () => {
  it('does not break a streak across unscheduled days', () => {
    // Schedule: Sunday(0) and Tuesday(2) only.
    const h = habit({ schedule: [0, 2] });
    // today = Sunday. Completed today and the previous scheduled day (Tuesday).
    const logs = [log('habit-1', TODAY), log('habit-1', addDays(TODAY, -5))]; // -5 days = Tuesday
    expect(computeStreaks(h, logs).current).toBe(2);
  });

  it('still breaks when a scheduled day is missed', () => {
    const h = habit({ schedule: [0, 2] });
    // today = Sunday done; previous Tuesday missed; earlier Sunday done.
    const logs = [log('habit-1', TODAY), log('habit-1', addDays(TODAY, -7))];
    expect(computeStreaks(h, logs).current).toBe(1);
  });
});

describe('computeStreaks — future and creation guards', () => {
  it('never counts future dates as missed', () => {
    const h = habit({ createdAt: TODAY });
    // No completions, created today → no streak yet, and no penalty.
    expect(computeStreaks(h, []).current).toBe(0);
    expect(computeStreaks(h, []).longest).toBe(0);
  });

  it('ignores dates before the habit was created', () => {
    const h = habit({ createdAt: addDays(TODAY, -2) });
    const logs = [log('habit-1', TODAY), log('habit-1', addDays(TODAY, -1)), log('habit-1', addDays(TODAY, -5))];
    // The -5 day log is before creation; streak still counts today + yesterday.
    expect(computeStreaks(h, logs).current).toBe(2);
  });
});

describe('computeStreaks — longest', () => {
  it('finds the longest historical run', () => {
    const logs = [
      log('habit-1', TODAY),
      log('habit-1', addDays(TODAY, -10)),
      log('habit-1', addDays(TODAY, -11)),
      log('habit-1', addDays(TODAY, -12)),
      log('habit-1', addDays(TODAY, -13)),
    ];
    const { current, longest } = computeStreaks(habit(), logs);
    expect(current).toBe(1);
    expect(longest).toBe(4);
  });
});

describe('completionRate', () => {
  it('counts only scheduled days up to today', () => {
    const h = habit({ createdAt: '2020-01-01' });
    const logs = [log('habit-1', TODAY), log('habit-1', addDays(TODAY, -1))];
    const rate = completionRate(h, logs, addDays(TODAY, -3), TODAY);
    expect(rate.scheduled).toBe(4);
    expect(rate.completed).toBe(2);
    expect(rate.rate).toBe(50);
  });

  it('excludes future scheduled days and returns 0 with nothing scheduled', () => {
    const h = habit({ createdAt: TODAY });
    const rate = completionRate(h, [], TODAY, addDays(TODAY, 5));
    expect(rate.scheduled).toBe(1); // only today is in the past/present window
    expect(rate.rate).toBe(0);
  });
});

describe('habitsScheduledOn and isCompletedOn', () => {
  it('returns only scheduled, non-archived habits with their completion state', () => {
    const habits = [
      habit({ id: 'a' }),
      habit({ id: 'b', schedule: [3] }), // not today (Sunday)
      habit({ id: 'c', archived: true }),
    ];
    const logs = [log('a', TODAY)];
    const result = habitsScheduledOn(habits, logs, TODAY);
    expect(result.map((r) => r.habit.id)).toEqual(['a']);
    expect(result[0].completed).toBe(true);
    expect(isCompletedOn(logs, 'b', TODAY)).toBe(false);
  });
});
