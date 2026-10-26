import { isDateStr, todayStr } from './dates.js';

/**
 * Goal progress is *always* derived from milestones:
 *   progress = completedMilestones / totalMilestones * 100
 * A goal with zero milestones has no measurable progress; we return `null` so
 * callers can render a safe "no milestones yet" state instead of dividing by 0.
 */
export function goalProgress(goal) {
  if (!goal || !Array.isArray(goal.milestones) || goal.milestones.length === 0) return null;
  const done = goal.milestones.filter((m) => m && m.done).length;
  return Math.round((done / goal.milestones.length) * 100);
}

/** `completed` | `overdue` | `active` — derived, never stored. */
export function goalStatus(goal) {
  const progress = goalProgress(goal);
  const total = Array.isArray(goal.milestones) ? goal.milestones.length : 0;
  const done = Array.isArray(goal.milestones) ? goal.milestones.filter((m) => m && m.done).length : 0;
  if (total > 0 && done === total) return 'completed';
  if (goal?.targetDate && isDateStr(goal.targetDate) && goal.targetDate < todayStr() && progress !== 100) {
    return 'overdue';
  }
  return 'active';
}

export function milestoneCounts(goal) {
  const total = Array.isArray(goal.milestones) ? goal.milestones.length : 0;
  const done = Array.isArray(goal.milestones) ? goal.milestones.filter((m) => m && m.done).length : 0;
  return { done, total, remaining: total - done };
}
