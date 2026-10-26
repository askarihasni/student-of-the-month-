import {
  addDays,
  dayOfWeek,
  formatShortDate,
  isDateStr,
  toDateStr,
  todayStr,
  weekOf,
} from '../utils/dates.js';
import { computeStreaks, completionRate, habitsScheduledOn, isScheduledOn } from '../utils/streaks.js';
import { goalProgress, goalStatus, milestoneCounts } from '../utils/goals.js';
import { PRIORITIES, STATUSES } from '../data/defaults.js';

/**
 * Pure derived-data selectors. Every number shown in the UI comes from here —
 * nothing is stored as a pre-computed total, so a single record change is
 * reflected everywhere at once.
 */

/* ------------------------------- tasks ------------------------------- */

export function isOverdue(task, today = todayStr()) {
  return !!task && task.status !== 'Completed' && !!task.dueDate && task.dueDate < today;
}

export function isDueToday(task, today = todayStr()) {
  return !!task && task.status !== 'Completed' && task.dueDate === today;
}

export function taskLocalDate(task) {
  if (!task?.completedAt) return null;
  return toDateStr(new Date(task.completedAt));
}

export function openTasks(state) {
  return state.tasks.filter((t) => t.status !== 'Completed');
}

export function overdueTasks(state, today = todayStr()) {
  return state.tasks.filter((t) => isOverdue(t, today));
}

export function tasksDueToday(state, today = todayStr()) {
  return state.tasks.filter((t) => t.dueDate === today);
}

export function tasksCompletedOn(state, dateStr) {
  return state.tasks.filter((t) => taskLocalDate(t) === dateStr);
}

export function completedTodayTasks(state, today = todayStr()) {
  return tasksCompletedOn(state, today);
}

/** Open tasks sorted by due date; undated tasks last. */
export function upcomingTasks(state, limit = 6, today = todayStr()) {
  return openTasks(state)
    .filter((t) => t.dueDate)
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      const at = a.dueTime || '23:59';
      const bt = b.dueTime || '23:59';
      return at < bt ? -1 : at > bt ? 1 : 0;
    })
    .filter((t) => t.dueDate >= today || isOverdue(t, today))
    .slice(0, limit);
}

export function sortTasks(tasks, key, direction = 'asc') {
  const dir = direction === 'desc' ? -1 : 1;
  const priorityRank = (p) => PRIORITIES.indexOf(p);
  const list = [...tasks];
  list.sort((a, b) => {
    let cmp = 0;
    if (key === 'due') {
      const ad = a.dueDate || '9999-12-31';
      const bd = b.dueDate || '9999-12-31';
      cmp = ad < bd ? -1 : ad > bd ? 1 : 0;
      if (cmp === 0) cmp = (a.dueTime || '23:59') < (b.dueTime || '23:59') ? -1 : (a.dueTime || '23:59') > (b.dueTime || '23:59') ? 1 : 0;
    } else if (key === 'priority') {
      cmp = priorityRank(b.priority) - priorityRank(a.priority); // Urgent first
    } else if (key === 'created') {
      cmp = (a.createdAt ?? 0) - (b.createdAt ?? 0);
    } else if (key === 'title') {
      cmp = a.title.localeCompare(b.title);
    }
    return cmp * dir;
  });
  return list;
}

export function taskCountsByStatus(state) {
  return STATUSES.map((status) => ({
    name: status,
    value: state.tasks.filter((t) => t.status === status).length,
  }));
}

export function taskCountsByPriority(state) {
  return PRIORITIES.map((priority) => ({
    name: priority,
    value: state.tasks.filter((t) => t.priority === priority && t.status !== 'Completed').length,
  }));
}

/* ------------------------------- habits ------------------------------ */

export function habitSummary(state, dateStr = todayStr()) {
  const scheduled = habitsScheduledOn(state.habits, state.habitLogs, dateStr);
  const total = scheduled.length;
  const done = scheduled.filter((s) => s.completed).length;
  return {
    scheduled,
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : null,
  };
}

export function habitStats(state, habit) {
  const streaks = computeStreaks(habit, state.habitLogs);
  const today = todayStr();
  const week = completionRate(habit, state.habitLogs, addDays(today, -6), today);
  const month = completionRate(habit, state.habitLogs, addDays(today, -29), today);
  return { ...streaks, week, month };
}

/** Completion rate for every active habit over a range — used by analytics. */
export function habitAggregate(state, from, to) {
  const active = state.habits.filter((h) => !h.archived);
  let completed = 0;
  let scheduled = 0;
  for (const habit of active) {
    const r = completionRate(habit, state.habitLogs, from, to);
    completed += r.completed;
    scheduled += r.scheduled;
  }
  return { completed, scheduled, rate: scheduled ? Math.round((completed / scheduled) * 100) : 0 };
}

/** Per-day habit completion rate across all active habits. */
export function habitRateSeries(state, from, to) {
  const out = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    guard += 1;
    const active = state.habits.filter((h) => !h.archived && isScheduledOn(h, cursor));
    const done = active.filter((h) =>
      state.habitLogs.some((l) => l.habitId === h.id && l.date === cursor),
    ).length;
    out.push({
      date: cursor,
      label: formatShortDate(cursor),
      rate: active.length ? Math.round((done / active.length) * 100) : 0,
      done,
      total: active.length,
    });
    cursor = addDays(cursor, 1);
  }
  return out;
}

/* ------------------------------ calendar ----------------------------- */

export function eventsOn(state, dateStr) {
  return state.events
    .filter((e) => e.date === dateStr)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/** Tasks whose deadline falls on `dateStr` (including overdue carry-over). */
export function taskDeadlinesOn(state, dateStr, includeOverdue = false) {
  return state.tasks.filter(
    (t) => t.status !== 'Completed' && t.dueDate && (t.dueDate === dateStr || (includeOverdue && t.dueDate < dateStr)),
  );
}

/**
 * Merged agenda for one date: timed events, timed deadlines, then all-day
 * deadlines. Items are plain descriptors — the calendar never copies records.
 */
export function agendaFor(state, dateStr) {
  const events = eventsOn(state, dateStr).map((e) => ({
    kind: 'event',
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    category: e.category,
    record: e,
  }));
  const deadlines = state.tasks
    .filter((t) => t.status !== 'Completed' && t.dueDate === dateStr)
    .map((t) => ({
      kind: 'task',
      id: t.id,
      title: t.title,
      start: t.dueTime || null,
      end: null,
      category: t.category || t.priority,
      priority: t.priority,
      record: t,
    }));

  const timed = [...events, ...deadlines].filter((i) => i.start);
  const allDay = deadlines.filter((i) => !i.start);
  timed.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return { events, deadlines, allDay, timed, items: [...allDay, ...timed] };
}

/**
 * Two intervals conflict when their ranges intersect. Intervals that only
 * touch at a boundary (a.end === b.start) do NOT conflict.
 */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function conflictsFor(state, { date, start, end, excludeId = null }) {
  return state.events.filter(
    (e) => e.id !== excludeId && e.date === date && overlaps(start, end, e.start, e.end),
  );
}

/* -------------------------------- focus ------------------------------ */

export function focusMinutesOn(state, dateStr) {
  return state.sessions
    .filter((s) => s.date === dateStr && s.type === 'focus')
    .reduce((sum, s) => sum + (s.minutes || 0), 0);
}

export function focusGoal(state) {
  const goal = state.prefs.dailyFocusGoalMin ?? 120;
  const minutes = focusMinutesOn(state, todayStr());
  return { minutes, goal, percent: Math.min(100, Math.round((minutes / goal) * 100)) };
}

export function sessionsInRange(state, from, to) {
  return state.sessions.filter((s) => s.type === 'focus' && s.date >= from && s.date <= to);
}

/* -------------------------------- goals ------------------------------ */

export function goalSummaries(state) {
  return state.goals.map((goal) => ({
    goal,
    progress: goalProgress(goal),
    status: goalStatus(goal),
    counts: milestoneCounts(goal),
  }));
}

export function goalSummaryCounts(state) {
  const summaries = goalSummaries(state);
  return {
    total: summaries.length,
    active: summaries.filter((s) => s.status === 'active').length,
    completed: summaries.filter((s) => s.status === 'completed').length,
    overdue: summaries.filter((s) => s.status === 'overdue').length,
  };
}

/* ------------------------------ dashboard ---------------------------- */

/**
 * Daily completion = share of "today's plan" that is done, where the plan is
 * every task due today or already overdue, plus every habit scheduled today.
 */
export function dailyCompletion(state, today = todayStr()) {
  const planTasks = state.tasks.filter((t) => t.dueDate && t.dueDate <= today);
  const habits = habitsScheduledOn(state.habits, state.habitLogs, today);
  const total = planTasks.length + habits.length;
  if (total === 0) return { value: null, done: 0, total: 0 };
  const doneTasks = planTasks.filter((t) => t.status === 'Completed').length;
  const doneHabits = habits.filter((h) => h.completed).length;
  return {
    value: Math.round(((doneTasks + doneHabits) / total) * 100),
    done: doneTasks + doneHabits,
    total,
  };
}

export function dashboardStats(state, today = todayStr()) {
  const habits = habitSummary(state, today);
  const completion = dailyCompletion(state, today);
  const focus = focusGoal(state);
  const goals = goalSummaryCounts(state);
  const overdue = overdueTasks(state, today);
  const dueToday = tasksDueToday(state, today);
  const doneToday = completedTodayTasks(state, today);
  return {
    today,
    tasks: {
      open: openTasks(state).length,
      doneToday: doneToday.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      total: state.tasks.length,
    },
    habits: {
      total: habits.total,
      done: habits.done,
      percent: habits.percent,
      active: state.habits.filter((h) => !h.archived).length,
    },
    goals,
    focus,
    completion,
    overdue,
    dueToday,
    doneToday,
  };
}

/** Seven-day productivity series ending today — powers the dashboard chart. */
export function weeklySeries(state, today = todayStr()) {
  const start = addDays(today, -6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return days.map((date) => {
    const tasksCompleted = state.tasks.filter((t) => taskLocalDate(t) === date).length;
    const focusMinutes = focusMinutesOn(state, date);
    const habits = habitsScheduledOn(state.habits, state.habitLogs, date);
    const habitDone = habits.filter((h) => h.completed).length;
    return {
      date,
      day: dayOfWeek(date),
      label: formatShortDate(date).split(', ')[1],
      weekday: formatShortDate(date).split(',')[0],
      tasksCompleted,
      focusMinutes,
      habitDone,
      habitTotal: habits.length,
      habitRate: habits.length ? Math.round((habitDone / habits.length) * 100) : 0,
    };
  });
}

/* ------------------------------ analytics ---------------------------- */

export function resolveRange(rangeKey, custom, today = todayStr()) {
  if (rangeKey === '7d') return { from: addDays(today, -6), to: today };
  if (rangeKey === '30d') return { from: addDays(today, -29), to: today };
  if (rangeKey === '90d') return { from: addDays(today, -89), to: today };
  if (rangeKey === 'month') {
    const from = `${today.slice(0, 7)}-01`;
    return { from, to: today };
  }
  if (rangeKey === 'custom' && custom?.from && custom?.to && isDateStr(custom.from) && isDateStr(custom.to)) {
    return custom.from <= custom.to
      ? { from: custom.from, to: custom.to }
      : { from: custom.to, to: custom.from };
  }
  return { from: addDays(today, -6), to: today };
}

export function dayList(from, to, cap = 400) {
  const out = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < cap) {
    guard += 1;
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Tasks completed per day inside the range. */
export function tasksCompletedSeries(state, from, to) {
  const days = dayList(from, to);
  return days.map((date) => ({
    date,
    label: formatShortDate(date),
    count: state.tasks.filter((t) => taskLocalDate(t) === date).length,
  }));
}

export function focusSeries(state, from, to) {
  return dayList(from, to).map((date) => ({
    date,
    label: formatShortDate(date),
    minutes: focusMinutesOn(state, date),
  }));
}

/** Combined daily trend used by the productivity chart. */
export function productivitySeries(state, from, to) {
  const tasks = tasksCompletedSeries(state, from, to);
  const focus = focusSeries(state, from, to);
  const habits = habitRateSeries(state, from, to);
  return tasks.map((t, i) => ({
    date: t.date,
    label: t.label,
    tasksCompleted: t.count,
    focusMinutes: focus[i]?.minutes ?? 0,
    habitRate: habits[i]?.rate ?? 0,
  }));
}

export function rangeStats(state, from, to) {
  const completedTasks = state.tasks.filter(
    (t) => t.completedAt && taskLocalDate(t) >= from && taskLocalDate(t) <= to,
  );
  const focus = sessionsInRange(state, from, to);
  const focusMinutes = focus.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const habits = habitAggregate(state, from, to);
  const createdTasks = state.tasks.filter((t) => {
    if (!t.createdAt) return false;
    const d = toDateStr(new Date(t.createdAt));
    return d >= from && d <= to;
  });
  const goalsCompleted = state.goals.filter((g) => {
    const counts = milestoneCounts(g);
    return counts.total > 0 && counts.done === counts.total;
  }).length;
  return {
    completedTasks: completedTasks.length,
    createdTasks: createdTasks.length,
    focusMinutes,
    focusSessions: focus.length,
    habitRate: habits.rate,
    habitScheduled: habits.scheduled,
    goalsCompleted,
    days: Math.max(1, dayList(from, to).length),
  };
}

export { weekOf };
