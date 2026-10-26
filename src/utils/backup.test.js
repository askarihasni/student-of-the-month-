import { describe, expect, it } from 'vitest';
import {
  buildBackup,
  parseBackupText,
  sanitizeState,
  validateBackup,
} from './backup.js';
import { SCHEMA_VERSION } from '../data/defaults.js';

const ID = (n) => `id-0000000-${n}`;

function validBackup() {
  return {
    app: 'LifeOS',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: '2026-06-14T00:00:00.000Z',
    data: {
      tasks: [
        {
          id: ID(1),
          title: 'Write report',
          description: '',
          priority: 'High',
          dueDate: '2026-06-20',
          dueTime: null,
          category: 'Work',
          estimateMin: 60,
          status: 'To Do',
          createdAt: 1_700_000_000_000,
          completedAt: null,
        },
      ],
      habits: [
        {
          id: ID(2),
          name: 'Read',
          description: '',
          icon: 'book',
          category: '',
          schedule: 'daily',
          createdAt: '2026-01-01',
          target: '',
          reminder: null,
          archived: false,
        },
      ],
      habitLogs: [{ id: ID(3), habitId: ID(2), date: '2026-06-14' }],
      events: [
        {
          id: ID(4),
          title: 'Standup',
          description: '',
          date: '2026-06-14',
          start: '09:00',
          end: '09:15',
          category: 'Work',
        },
      ],
      sessions: [
        {
          id: ID(5),
          type: 'focus',
          date: '2026-06-14',
          startedAt: 1_700_000_000_000,
          endedAt: 1_700_001_500_000,
          minutes: 25,
          taskId: null,
        },
      ],
      goals: [
        {
          id: ID(6),
          title: 'Ship v1',
          description: '',
          targetDate: '2026-07-01',
          category: 'Work',
          createdAt: 1_700_000_000_000,
          milestones: [{ id: ID(7), title: 'Design', description: '', done: true }],
        },
      ],
      prefs: { theme: 'dark' },
      timer: { status: 'idle', sessionType: 'focus', durationMs: 1_500_000, elapsedMs: 0 },
      dashboard: { order: ['summary', 'agenda'], hidden: [] },
    },
  };
}

describe('buildBackup', () => {
  it('wraps state with app metadata and the current schema version', () => {
    const raw = validBackup().data;
    const backup = buildBackup(raw);
    expect(backup.app).toBe('LifeOS');
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);
    expect(backup.data.tasks).toBe(raw.tasks);
    expect(backup.data.dashboard).toBe(raw.dashboard);
  });
});

describe('validateBackup — accepts valid data', () => {
  it('returns ok with the normalised record set', () => {
    const result = validateBackup(validBackup());
    expect(result.ok).toBe(true);
    expect(result.data.tasks).toHaveLength(1);
    expect(result.data.habits).toHaveLength(1);
    // pref defaults are filled in
    expect(result.data.prefs.focusMinutes).toBeGreaterThan(0);
  });
});

describe('validateBackup — rejects invalid data', () => {
  it('rejects a non-LifeOS file', () => {
    const b = validBackup();
    b.app = 'SomethingElse';
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/LifeOS/);
  });

  it('rejects an unsupported schema version', () => {
    const b = validBackup();
    b.schemaVersion = 999;
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/schemaVersion/);
  });

  it('rejects a missing required record array', () => {
    const b = validBackup();
    delete b.data.goals;
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/data\.goals/);
  });

  it('rejects a habit log referencing an unknown habit', () => {
    const b = validBackup();
    b.data.habitLogs = [{ id: ID(9), habitId: ID(999), date: '2026-06-14' }];
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/unknown habit/);
  });

  it('rejects duplicate record ids', () => {
    const b = validBackup();
    b.data.tasks.push({ ...b.data.tasks[0] });
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/duplicate id/);
  });

  it('rejects duplicate habit completions for the same pair', () => {
    const b = validBackup();
    b.data.habitLogs.push({ id: ID(10), habitId: ID(2), date: '2026-06-14' });
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/duplicate completion/);
  });

  it('rejects an event whose end is not after its start', () => {
    const b = validBackup();
    b.data.events[0].end = b.data.events[0].start;
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/later than the start/);
  });

  it('rejects malformed values such as a bad date', () => {
    const b = validBackup();
    b.data.tasks[0].dueDate = '2026-13-40';
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/YYYY-MM-DD/);
  });

  it('rejects a running timer with no startedAt', () => {
    const b = validBackup();
    b.data.timer = { status: 'running', sessionType: 'focus', durationMs: 1_500_000, elapsedMs: 0 };
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/startedAt/);
  });

  it('rejects unknown dashboard widgets', () => {
    const b = validBackup();
    b.data.dashboard = { order: ['nope'], hidden: [] };
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/unknown widget/);
  });

  it('never returns partial data on failure', () => {
    const b = validBackup();
    delete b.data.tasks;
    const result = validateBackup(b);
    expect(result.ok).toBe(false);
    expect(result.data).toBeUndefined();
  });
});

describe('parseBackupText', () => {
  it('parses valid JSON', () => {
    const result = parseBackupText('{"a":1}');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ a: 1 });
  });

  it('fails gracefully on empty or invalid input', () => {
    expect(parseBackupText('').ok).toBe(false);
    expect(parseBackupText('   ').ok).toBe(false);
    const bad = parseBackupText('{not json');
    expect(bad.ok).toBe(false);
    expect(bad.errors[0]).toMatch(/Invalid JSON/);
  });
});

describe('sanitizeState — lenient localStorage loader', () => {
  it('returns a full, valid fallback for junk input', () => {
    const state = sanitizeState(null);
    expect(state.tasks).toEqual([]);
    expect(state.prefs.theme).toBeDefined();
    expect(state.timer.status).toBe('idle');
    expect(Array.isArray(state.dashboard.order)).toBe(true);
  });

  it('drops malformed records but keeps good ones', () => {
    const state = sanitizeState({
      tasks: [
        { id: ID(1), title: 'Keep me', priority: 'High', status: 'To Do' },
        { id: 'short', title: 'Drop me' }, // malformed id
        { id: ID(2), title: '' }, // empty title
        'not an object',
      ],
      habitLogs: [
        { id: ID(3), habitId: ID(5), date: '2026-06-14' },
        { id: ID(4), habitId: ID(5), date: '2026-06-14' }, // duplicate pair
      ],
      habits: [
        {
          id: ID(5),
          name: 'Read',
          schedule: 'daily',
          createdAt: '2026-01-01',
        },
      ],
    });
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].title).toBe('Keep me');
    expect(state.habitLogs).toHaveLength(1); // duplicates removed
  });

  it('clamps a stale running timer that already elapsed into paused', () => {
    const state = sanitizeState({
      timer: {
        status: 'running',
        sessionType: 'focus',
        durationMs: 60_000,
        elapsedMs: 60_000,
        startedAt: 1_700_000_000_000,
      },
    });
    expect(state.timer.status).toBe('paused');
  });
});
