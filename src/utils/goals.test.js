import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { goalProgress, goalStatus, milestoneCounts } from './goals.js';
import { addDays } from './dates.js';

const TODAY = '2026-06-14';

function goal(overrides = {}) {
  return { id: 'g1', title: 'Goal', milestones: [], targetDate: null, ...overrides };
}

function ms(done) {
  return { id: Math.random().toString(36).slice(2), title: 'step', description: '', done };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('goalProgress', () => {
  it('returns null when there are zero milestones (no divide-by-zero)', () => {
    expect(goalProgress(goal())).toBeNull();
    expect(goalProgress(goal({ milestones: [] }))).toBeNull();
    expect(goalProgress(null)).toBeNull();
  });

  it('computes completed milestones over total', () => {
    expect(goalProgress(goal({ milestones: [ms(true), ms(false), ms(false), ms(false)] }))).toBe(25);
    expect(goalProgress(goal({ milestones: [ms(true), ms(true)] }))).toBe(100);
    expect(goalProgress(goal({ milestones: [ms(false)] }))).toBe(0);
  });

  it('rounds to the nearest whole percent', () => {
    expect(goalProgress(goal({ milestones: [ms(true), ms(false), ms(false)] }))).toBe(33);
  });
});

describe('milestoneCounts', () => {
  it('reports done, total and remaining', () => {
    expect(milestoneCounts(goal({ milestones: [ms(true), ms(false)] }))).toEqual({
      done: 1,
      total: 2,
      remaining: 1,
    });
  });

  it('is safe for missing milestones', () => {
    expect(milestoneCounts({ id: 'x', title: 'y' })).toEqual({ done: 0, total: 0, remaining: 0 });
  });
});

describe('goalStatus', () => {
  it('is completed when every milestone is done', () => {
    expect(goalStatus(goal({ milestones: [ms(true), ms(true)] }))).toBe('completed');
  });

  it('is overdue when the target date has passed and it is unfinished', () => {
    expect(goalStatus(goal({ milestones: [ms(true), ms(false)], targetDate: addDays(TODAY, -1) }))).toBe('overdue');
  });

  it('is active when the target is in the future or absent', () => {
    expect(goalStatus(goal({ milestones: [ms(false)], targetDate: addDays(TODAY, 5) }))).toBe('active');
    expect(goalStatus(goal({ milestones: [ms(false)] }))).toBe('active');
  });

  it('is never overdue when completed, even past the target date', () => {
    expect(goalStatus(goal({ milestones: [ms(true)], targetDate: addDays(TODAY, -30) }))).toBe('completed');
  });

  it('treats a zero-milestone goal with a past target as overdue', () => {
    expect(goalStatus(goal({ milestones: [], targetDate: addDays(TODAY, -1) }))).toBe('overdue');
  });
});
