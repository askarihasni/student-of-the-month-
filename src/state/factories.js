import { createId } from '../utils/id.js';
import { todayStr } from '../utils/dates.js';
import { DEFAULT_PREFS } from '../data/defaults.js';
import { initialTimer } from '../utils/timer.js';

/**
 * Record factories. Components collect and validate user input, then build a
 * complete record here — reducers only ever swap whole, well-formed records.
 */

export function buildTask(values, existing = null) {
  const now = Date.now();
  return {
    id: existing?.id ?? createId(),
    title: (values.title ?? '').trim(),
    description: (values.description ?? '').trim(),
    priority: values.priority ?? 'Medium',
    dueDate: values.dueDate || null,
    dueTime: values.dueTime || null,
    category: (values.category ?? '').trim(),
    estimateMin: values.estimateMin ? Math.max(1, Math.round(Number(values.estimateMin))) : null,
    status: values.status ?? 'To Do',
    createdAt: existing?.createdAt ?? now,
    completedAt:
      (values.status ?? 'To Do') === 'Completed'
        ? (existing?.completedAt ?? now)
        : null,
  };
}

export function buildHabit(values, existing = null) {
  let schedule = values.schedule;
  if (Array.isArray(schedule)) {
    const days = [...new Set(schedule.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    schedule = days.length === 7 || days.length === 0 ? 'daily' : days;
  } else {
    schedule = 'daily';
  }
  return {
    id: existing?.id ?? createId(),
    name: (values.name ?? '').trim(),
    description: (values.description ?? '').trim(),
    icon: values.icon || 'circle',
    category: (values.category ?? '').trim(),
    schedule,
    createdAt: existing?.createdAt ?? values.createdAt ?? todayStr(),
    target: (values.target ?? '').trim(),
    reminder: values.reminder || null,
    archived: values.archived ?? existing?.archived ?? false,
  };
}

export function buildEvent(values, existing = null) {
  return {
    id: existing?.id ?? createId(),
    title: (values.title ?? '').trim(),
    description: (values.description ?? '').trim(),
    date: values.date,
    start: values.start,
    end: values.end,
    category: values.category || 'Other',
  };
}

export function buildMilestone(values, existing = null) {
  return {
    id: existing?.id ?? createId(),
    title: (values.title ?? '').trim(),
    description: (values.description ?? '').trim(),
    done: values.done ?? existing?.done ?? false,
  };
}

export function buildGoal(values, existing = null) {
  return {
    id: existing?.id ?? createId(),
    title: (values.title ?? '').trim(),
    description: (values.description ?? '').trim(),
    targetDate: values.targetDate || null,
    category: (values.category ?? '').trim(),
    createdAt: existing?.createdAt ?? Date.now(),
    milestones: values.milestones ?? existing?.milestones ?? [],
  };
}

export function buildSessionFromTimer(timer, sessionId, at = Date.now()) {
  return {
    id: sessionId,
    type: 'focus',
    date: toDateStrLocal(at),
    startedAt: timer.startedAt ?? at - timer.durationMs,
    endedAt: at,
    minutes: Math.max(1, Math.round(timer.durationMs / 60000)),
    taskId: timer.taskId ?? null,
  };
}

function toDateStrLocal(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function defaultTimerForPrefs(prefs = DEFAULT_PREFS) {
  return { ...initialTimer(), durationMs: (prefs.focusMinutes ?? 25) * 60000 };
}
