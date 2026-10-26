import { describe, expect, it } from 'vitest';
import {
  formatMs,
  initialTimer,
  isTimerDone,
  timerElapsed,
  timerProgress,
  timerRemaining,
} from './timer.js';

const DURATION = 25 * 60 * 1000;

describe('initialTimer', () => {
  it('starts idle with a focus session and no startedAt', () => {
    const t = initialTimer();
    expect(t.status).toBe('idle');
    expect(t.sessionType).toBe('focus');
    expect(t.startedAt).toBeNull();
    expect(t.elapsedMs).toBe(0);
  });
});

describe('timerElapsed / timerRemaining', () => {
  it('is timestamp based: a running timer derives elapsed from the wall clock', () => {
    const startedAt = 1_000_000;
    const timer = { ...initialTimer(), status: 'running', startedAt, durationMs: DURATION };
    // 60s later
    expect(timerElapsed(timer, startedAt + 60_000)).toBe(60_000);
    expect(timerRemaining(timer, startedAt + 60_000)).toBe(DURATION - 60_000);
  });

  it('adds accumulated elapsed after resumes', () => {
    const timer = {
      ...initialTimer(),
      status: 'running',
      elapsedMs: 5 * 60 * 1000,
      startedAt: 2_000_000,
      durationMs: DURATION,
    };
    expect(timerElapsed(timer, 2_000_000 + 30_000)).toBe(330_000);
  });

  it('does not advance a paused timer', () => {
    const timer = { ...initialTimer(), status: 'paused', elapsedMs: 12_000, durationMs: DURATION };
    expect(timerElapsed(timer, 9_999_999_999)).toBe(12_000);
  });

  it('never returns negative remaining', () => {
    const timer = { ...initialTimer(), status: 'running', startedAt: 1, durationMs: DURATION };
    expect(timerRemaining(timer, DURATION * 2)).toBe(0);
  });

  it('handles a missing timer safely', () => {
    expect(timerElapsed(null)).toBe(0);
    expect(timerRemaining(null)).toBe(0);
    expect(timerProgress(null)).toBe(0);
  });
});

describe('timerProgress', () => {
  it('is a bounded percentage', () => {
    const timer = { ...initialTimer(), status: 'running', startedAt: 1, durationMs: 100_000 };
    expect(timerProgress(timer, 1 + 25_000)).toBe(25);
    expect(timerProgress(timer, 1 + 999_999)).toBe(100);
  });
});

describe('isTimerDone', () => {
  it('is true only once the duration is reached', () => {
    const timer = { ...initialTimer(), status: 'running', startedAt: 1, durationMs: DURATION };
    expect(isTimerDone(timer, 1 + DURATION - 1)).toBe(false);
    expect(isTimerDone(timer, 1 + DURATION)).toBe(true);
    expect(isTimerDone(timer, 1 + DURATION + 5)).toBe(true);
  });

  it('is false for zero-duration timers', () => {
    expect(isTimerDone({ ...initialTimer(), durationMs: 0 }, 1)).toBe(false);
  });
});

describe('formatMs', () => {
  it('formats millisecond counts as mm:ss', () => {
    expect(formatMs(0)).toBe('00:00');
    expect(formatMs(59_000)).toBe('00:59');
    expect(formatMs(60_000)).toBe('01:00');
    expect(formatMs(25 * 60 * 1000)).toBe('25:00');
  });

  it('never shows negative time', () => {
    expect(formatMs(-5000)).toBe('00:00');
  });
});
