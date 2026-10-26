import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dayOfWeek,
  daysBetween,
  formatDuration,
  formatTime,
  isDateStr,
  isTimeStr,
  minutesToTime,
  nowTimeStr,
  parseDateStr,
  timeToMinutes,
  toDateStr,
  todayStr,
  weekOf,
} from './dates.js';

describe('isDateStr', () => {
  it('accepts well-formed local dates', () => {
    expect(isDateStr('2026-01-01')).toBe(true);
    expect(isDateStr('2024-02-29')).toBe(true); // leap year
  });

  it('rejects malformed or impossible dates', () => {
    expect(isDateStr('2026-1-1')).toBe(false);
    expect(isDateStr('2026-13-01')).toBe(false);
    expect(isDateStr('2026-02-30')).toBe(false);
    expect(isDateStr(20260101)).toBe(false);
    expect(isDateStr('not-a-date')).toBe(false);
    expect(isDateStr(null)).toBe(false);
  });
});

describe('parseDateStr / toDateStr round-trip', () => {
  it('parses to a local midnight date without a UTC shift', () => {
    const date = parseDateStr('2026-03-15');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(0);
    expect(toDateStr(date)).toBe('2026-03-15');
  });

  it('returns null for invalid input', () => {
    expect(parseDateStr('nope')).toBeNull();
  });
});

describe('addDays / addMonths', () => {
  it('adds and subtracts days across month boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('clamps the day of month when adding months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15');
  });
});

describe('dayOfWeek and weekOf', () => {
  it('computes Sunday-start weeks', () => {
    // 2026-03-15 is a Sunday.
    expect(dayOfWeek('2026-03-15')).toBe(0);
    const week = weekOf('2026-03-18'); // Wednesday
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-03-15');
    expect(week[6]).toBe('2026-03-21');
    expect(week.every(isDateStr)).toBe(true);
  });
});

describe('daysBetween', () => {
  it('counts whole days signed from a to b', () => {
    expect(daysBetween('2026-03-01', '2026-03-08')).toBe(7);
    expect(daysBetween('2026-03-08', '2026-03-01')).toBe(-7);
  });
});

describe('time helpers', () => {
  it('validates HH:MM strings', () => {
    expect(isTimeStr('09:30')).toBe(true);
    expect(isTimeStr('23:59')).toBe(true);
    expect(isTimeStr('24:00')).toBe(false);
    expect(isTimeStr('9:30')).toBe(false);
  });

  it('converts between minutes and time strings', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(24 * 60)).toBe('23:59'); // clamped
    expect(Number.isNaN(timeToMinutes('bad'))).toBe(true);
  });

  it('formats a 24h time for display', () => {
    expect(formatTime('00:05')).not.toBe('');
  });

  it('produces a valid current time string', () => {
    expect(isTimeStr(nowTimeStr())).toBe(true);
  });
});

describe('formatDuration', () => {
  it('formats minutes into readable hours and minutes', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
  });
});

describe('todayStr', () => {
  it('is a valid date string equal to the local date', () => {
    expect(isDateStr(todayStr())).toBe(true);
    expect(todayStr()).toBe(toDateStr(new Date()));
  });
});
