import { addDays, dayOfWeek, daysBetween, isDateStr, todayStr } from './dates.js';

/**
 * Streak conventions used consistently across LifeOS
 * ---------------------------------------------------
 * 1. A habit is "scheduled" on a date when its schedule includes that weekday
 *    (`daily` = every day, otherwise the selected weekdays 0=Sun … 6=Sat).
 * 2. Unscheduled days are rest days: they neither extend nor break a streak.
 * 3. A scheduled day with no completion record breaks the streak — except for
 *    *today*. While today is still pending the streak is reported as of
 *    yesterday (the day is not lost yet, and is not yet counted either).
 * 4. Future scheduled dates are never treated as missed.
 * 5. Dates before the habit's creation date are ignored entirely.
 * 6. Completion rates only consider scheduled dates up to and including today.
 */

/** Whether `habit` is scheduled on `dateStr`. */
export function isScheduledOn(habit, dateStr) {
  if (!habit || !isDateStr(dateStr)) return false;
  if (habit.schedule === 'daily' || (Array.isArray(habit.schedule) && habit.schedule.length === 7)) {
    return true;
  }
  if (Array.isArray(habit.schedule)) return habit.schedule.includes(dayOfWeek(dateStr));
  return true;
}

/** Set of dates on which `habit` was logged. */
export function completionSet(habitLogs, habitId) {
  const set = new Set();
  for (const log of habitLogs || []) {
    if (log.habitId === habitId && isDateStr(log.date)) set.add(log.date);
  }
  return set;
}

function firstRelevantDate(habit, completed) {
  const created = isDateStr(habit.createdAt) ? habit.createdAt : todayStr();
  let first = created;
  for (const date of completed) {
    if (date < first) first = date;
  }
  return first;
}

/**
 * Current and longest streak for a habit.
 * Returns `{ current, longest }` in whole days (scheduled days) — rest days do
 * not count toward the number.
 */
export function computeStreaks(habit, habitLogs) {
  if (!habit) return { current: 0, longest: 0 };
  const completed = completionSet(habitLogs, habit.id);
  const today = todayStr();
  const created = isDateStr(habit.createdAt) ? habit.createdAt : today;
  const anchor = firstRelevantDate(habit, completed);
  if (anchor > today) return { current: 0, longest: 0 };

  // ---- current streak: walk backwards from today ----
  let current = 0;
  let cursor = today;
  // Today does not break a streak while it is still pending.
  if (isScheduledOn(habit, today) && !completed.has(today)) {
    cursor = addDays(today, -1);
  }
  // Safety cap so a corrupt record can never loop forever.
  let guard = 0;
  while (cursor >= created && cursor >= anchor && guard < 4000) {
    guard += 1;
    if (isScheduledOn(habit, cursor)) {
      if (completed.has(cursor)) current += 1;
      else break;
    }
    cursor = addDays(cursor, -1);
  }

  // ---- longest streak: scan forward across the habit's lifetime ----
  let longest = 0;
  let run = 0;
  const span = daysBetween(anchor, today);
  const limit = Math.min(span, 4000);
  for (let i = 0; i <= limit; i += 1) {
    const date = addDays(anchor, i);
    if (!isScheduledOn(habit, date)) continue; // rest day
    if (completed.has(date)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      const isPendingToday = date === today;
      if (!isPendingToday) run = 0;
    }
  }
  // A streak that only exists because of a pending today still shows 0 above,
  // which is correct: nothing has been completed yet.

  return { current, longest: Math.max(longest, current) };
}

/**
 * Completion rate over an inclusive date range.
 * Only scheduled dates from max(habit creation, range start) through min(today,
 * range end) are counted. Future scheduled dates are excluded.
 *
 * @returns {{completed: number, scheduled: number, rate: number}}
 */
export function completionRate(habit, habitLogs, fromStr, toStr) {
  const from = isDateStr(fromStr) ? fromStr : todayStr();
  const to = isDateStr(toStr) ? toStr : todayStr();
  if (!habit) return { completed: 0, scheduled: 0, rate: 0 };
  const today = todayStr();
  const created = isDateStr(habit.createdAt) ? habit.createdAt : '0000-01-01';
  const rangeStart = from > created ? from : created; // max(from, createdAt)
  const rangeEnd = to < today ? to : today; // min(to, today)

  if (rangeStart > rangeEnd) return { completed: 0, scheduled: 0, rate: 0 };

  const completed = completionSet(habitLogs, habit.id);
  let scheduledCount = 0;
  let doneCount = 0;
  let cursor = rangeStart;
  let guard = 0;
  while (cursor <= rangeEnd && guard < 4000) {
    guard += 1;
    if (isScheduledOn(habit, cursor)) {
      scheduledCount += 1;
      if (completed.has(cursor)) doneCount += 1;
    }
    cursor = addDays(cursor, 1);
  }
  return {
    completed: doneCount,
    scheduled: scheduledCount,
    rate: scheduledCount ? Math.round((doneCount / scheduledCount) * 100) : 0,
  };
}

/** Was `habit` completed on `dateStr`? */
export function isCompletedOn(habitLogs, habitId, dateStr) {
  return (habitLogs || []).some((l) => l.habitId === habitId && l.date === dateStr);
}

/** Habits scheduled on `dateStr` that are not archived. */
export function habitsScheduledOn(habits, habitLogs, dateStr) {
  return (habits || [])
    .filter((h) => !h.archived && isScheduledOn(h, dateStr))
    .map((h) => ({
      habit: h,
      completed: isCompletedOn(habitLogs, h.id, dateStr),
    }));
}
