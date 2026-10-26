import { PRIORITIES, STATUSES, EVENT_CATEGORIES, DEFAULT_PREFS, DEFAULT_DASHBOARD, WIDGET_IDS, SCHEMA_VERSION } from '../data/defaults.js';
import { isDateStr, isTimeStr } from './dates.js';
import { isId } from './id.js';
import { TIMER_STATUS, SESSION_TYPES, initialTimer } from './timer.js';

/**
 * Backup build / validation.
 *
 * `validateBackup` is strict: it returns a list of human-readable problems and
 * never produces partial state, so a failed import can be rejected atomically
 * without touching existing data. `sanitizeState` is the lenient counterpart
 * used when reading localStorage, where dropping a damaged record is better
 * than crashing the app.
 */

export function buildBackup(state) {
  return {
    app: 'LifeOS',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: state.tasks,
      habits: state.habits,
      habitLogs: state.habitLogs,
      events: state.events,
      sessions: state.sessions,
      goals: state.goals,
      prefs: state.prefs,
      timer: state.timer,
      dashboard: state.dashboard,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Strict per-record validators                                        */
/* ------------------------------------------------------------------ */

function err(path, message) {
  return `${path}: ${message}`;
}

function checkId(value, path, errors) {
  if (!isId(value)) {
    errors.push(err(path, 'missing or malformed id'));
    return false;
  }
  return true;
}

function checkStr(value, path, errors, { max = 500, allowEmpty = false, required = true } = {}) {
  if (value == null && !required) return true;
  if (typeof value !== 'string') {
    errors.push(err(path, 'must be text'));
    return false;
  }
  if (!allowEmpty && !value.trim()) {
    errors.push(err(path, 'must not be empty'));
    return false;
  }
  if (value.length > max) {
    errors.push(err(path, `must be at most ${max} characters`));
    return false;
  }
  return true;
}

function checkEnum(value, allowed, path, errors) {
  if (!allowed.includes(value)) {
    errors.push(err(path, `must be one of: ${allowed.join(', ')}`));
    return false;
  }
  return true;
}

function checkNullableDate(value, path, errors) {
  if (value == null) return true;
  if (!isDateStr(value)) {
    errors.push(err(path, 'must be a YYYY-MM-DD date'));
    return false;
  }
  return true;
}

function checkNullableTime(value, path, errors) {
  if (value == null) return true;
  if (!isTimeStr(value)) {
    errors.push(err(path, 'must be an HH:MM time'));
    return false;
  }
  return true;
}

function checkNullableNumber(value, path, errors, { integer = false, min = -Infinity, max = Infinity } = {}) {
  if (value == null) return true;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(err(path, 'must be a finite number'));
    return false;
  }
  if (integer && !Number.isInteger(value)) {
    errors.push(err(path, 'must be a whole number'));
    return false;
  }
  if (value < min || value > max) {
    errors.push(err(path, `must be between ${min} and ${max}`));
    return false;
  }
  return true;
}

function validateSchedule(value, path, errors) {
  if (value === 'daily') return true;
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(err(path, 'must be "daily" or a non-empty array of weekdays (0-6)'));
    return false;
  }
  const unique = new Set();
  for (const d of value) {
    if (!Number.isInteger(d) || d < 0 || d > 6) {
      errors.push(err(path, 'weekdays must be whole numbers 0-6'));
      return false;
    }
    unique.add(d);
  }
  if (unique.size !== value.length) {
    errors.push(err(path, 'contains duplicate weekdays'));
    return false;
  }
  return true;
}

function validateTask(task, path, errors, index) {
  const p = `${path}[${index}]`;
  if (!checkId(task?.id, `${p}.id`, errors)) return;
  checkStr(task.title, `${p}.title`, errors, { max: 300 });
  checkStr(task.description ?? '', `${p}.description`, errors, { max: 5000, allowEmpty: true, required: false });
  checkEnum(task.priority, PRIORITIES, `${p}.priority`, errors);
  checkEnum(task.status, STATUSES, `${p}.status`, errors);
  checkNullableDate(task.dueDate, `${p}.dueDate`, errors);
  checkNullableTime(task.dueTime, `${p}.dueTime`, errors);
  checkStr(task.category ?? '', `${p}.category`, errors, { max: 80, allowEmpty: true, required: false });
  checkNullableNumber(task.estimateMin, `${p}.estimateMin`, errors, { integer: true, min: 0, max: 60 * 24 * 30 });
  checkNullableNumber(task.createdAt, `${p}.createdAt`, errors);
  checkNullableNumber(task.completedAt, `${p}.completedAt`, errors);
}

function validateHabit(habit, path, errors, index) {
  const p = `${path}[${index}]`;
  if (!checkId(habit?.id, `${p}.id`, errors)) return;
  checkStr(habit.name, `${p}.name`, errors, { max: 200 });
  checkStr(habit.description ?? '', `${p}.description`, errors, { max: 2000, allowEmpty: true, required: false });
  checkStr(habit.icon ?? 'circle', `${p}.icon`, errors, { max: 60, allowEmpty: true, required: false });
  checkStr(habit.category ?? '', `${p}.category`, errors, { max: 80, allowEmpty: true, required: false });
  validateSchedule(habit.schedule, `${p}.schedule`, errors);
  if (!isDateStr(habit.createdAt)) errors.push(err(`${p}.createdAt`, 'must be a YYYY-MM-DD date'));
  checkStr(habit.target ?? '', `${p}.target`, errors, { max: 120, allowEmpty: true, required: false });
  checkNullableTime(habit.reminder, `${p}.reminder`, errors);
  if (typeof habit.archived !== 'boolean') errors.push(err(`${p}.archived`, 'must be true or false'));
}

function validateHabitLog(log, path, errors, index, knownHabits) {
  const p = `${path}[${index}]`;
  if (!checkId(log?.id, `${p}.id`, errors)) return;
  if (!isId(log.habitId)) errors.push(err(`${p}.habitId`, 'missing or malformed id'));
  else if (knownHabits && !knownHabits.has(log.habitId)) {
    errors.push(err(`${p}.habitId`, `references unknown habit "${log.habitId}"`));
  }
  if (!isDateStr(log.date)) errors.push(err(`${p}.date`, 'must be a YYYY-MM-DD date'));
}

function validateEvent(event, path, errors, index) {
  const p = `${path}[${index}]`;
  if (!checkId(event?.id, `${p}.id`, errors)) return;
  checkStr(event.title, `${p}.title`, errors, { max: 300 });
  checkStr(event.description ?? '', `${p}.description`, errors, { max: 5000, allowEmpty: true, required: false });
  if (!isDateStr(event.date)) errors.push(err(`${p}.date`, 'must be a YYYY-MM-DD date'));
  if (!isTimeStr(event.start)) errors.push(err(`${p}.start`, 'must be an HH:MM time'));
  if (!isTimeStr(event.end)) errors.push(err(`${p}.end`, 'must be an HH:MM time'));
  if (isTimeStr(event.start) && isTimeStr(event.end) && event.end <= event.start) {
    errors.push(err(`${p}.end`, 'must be later than the start time'));
  }
  checkEnum(event.category, EVENT_CATEGORIES, `${p}.category`, errors);
}

function validateSession(session, path, errors, index) {
  const p = `${path}[${index}]`;
  if (!checkId(session?.id, `${p}.id`, errors)) return;
  checkEnum(session.type, SESSION_TYPES, `${p}.type`, errors);
  if (!isDateStr(session.date)) errors.push(err(`${p}.date`, 'must be a YYYY-MM-DD date'));
  checkNullableNumber(session.startedAt, `${p}.startedAt`, errors);
  checkNullableNumber(session.endedAt, `${p}.endedAt`, errors);
  if (typeof session.minutes !== 'number' || !Number.isFinite(session.minutes) || session.minutes <= 0) {
    errors.push(err(`${p}.minutes`, 'must be a positive number of minutes'));
  }
  if (session.taskId != null && !isId(session.taskId)) {
    errors.push(err(`${p}.taskId`, 'must be null or a valid id'));
  }
}

function validateMilestone(ms, path, errors, index) {
  const p = `${path}[${index}]`;
  if (!checkId(ms?.id, `${p}.id`, errors)) return;
  checkStr(ms.title, `${p}.title`, errors, { max: 300 });
  checkStr(ms.description ?? '', `${p}.description`, errors, { max: 2000, allowEmpty: true, required: false });
  if (typeof ms.done !== 'boolean') errors.push(err(`${p}.done`, 'must be true or false'));
}

function validateGoal(goal, path, errors, index) {
  const p = `${path}[${index}]`;
  if (!checkId(goal?.id, `${p}.id`, errors)) return;
  checkStr(goal.title, `${p}.title`, errors, { max: 300 });
  checkStr(goal.description ?? '', `${p}.description`, errors, { max: 5000, allowEmpty: true, required: false });
  checkNullableDate(goal.targetDate, `${p}.targetDate`, errors);
  checkStr(goal.category ?? '', `${p}.category`, errors, { max: 80, allowEmpty: true, required: false });
  checkNullableNumber(goal.createdAt, `${p}.createdAt`, errors);
  if (!Array.isArray(goal.milestones)) {
    errors.push(err(`${p}.milestones`, 'must be an array'));
    return;
  }
  goal.milestones.forEach((m, i) => validateMilestone(m, `${p}.milestones`, errors, i));
}

function checkUniqueIds(items, path, errors) {
  const seen = new Set();
  items.forEach((item, i) => {
    if (item && isId(item.id)) {
      if (seen.has(item.id)) errors.push(err(`${path}[${i}].id`, `duplicate id "${item.id}"`));
      seen.add(item.id);
    }
  });
}

function validatePrefs(prefs, errors) {
  if (typeof prefs !== 'object' || prefs == null || Array.isArray(prefs)) {
    errors.push(err('data.prefs', 'must be an object'));
    return;
  }
  checkEnum(prefs.theme, ['dark', 'light'], 'data.prefs.theme', errors);
  for (const key of ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'dailyFocusGoalMin', 'pomodoroCycles']) {
    checkNullableNumber(prefs[key], `data.prefs.${key}`, errors, { integer: true, min: 1, max: 1440 });
  }
}

function validateTimer(timer, errors) {
  if (typeof timer !== 'object' || timer == null || Array.isArray(timer)) {
    errors.push(err('data.timer', 'must be an object'));
    return;
  }
  checkEnum(timer.status, TIMER_STATUS, 'data.timer.status', errors);
  checkEnum(timer.sessionType, SESSION_TYPES, 'data.timer.sessionType', errors);
  checkNullableNumber(timer.durationMs, 'data.timer.durationMs', errors, { min: 0, max: 24 * 3600 * 1000 });
  checkNullableNumber(timer.elapsedMs, 'data.timer.elapsedMs', errors, { min: 0, max: 24 * 3600 * 1000 });
  checkNullableNumber(timer.startedAt, 'data.timer.startedAt', errors);
  if (timer.sessionId != null && !isId(timer.sessionId)) errors.push(err('data.timer.sessionId', 'must be null or a valid id'));
  if (timer.taskId != null && !isId(timer.taskId)) errors.push(err('data.timer.taskId', 'must be null or a valid id'));
  if (timer.status === 'running' && (timer.startedAt == null || !Number.isFinite(timer.startedAt))) {
    errors.push(err('data.timer.startedAt', 'is required while the timer is running'));
  }
  if (typeof timer.durationMs !== 'number' || timer.durationMs <= 0) {
    errors.push(err('data.timer.durationMs', 'must be greater than 0'));
  }
}

function validateDashboard(dashboard, errors) {
  if (typeof dashboard !== 'object' || dashboard == null || Array.isArray(dashboard)) {
    errors.push(err('data.dashboard', 'must be an object'));
    return;
  }
  if (!Array.isArray(dashboard.order)) {
    errors.push(err('data.dashboard.order', 'must be an array'));
    return;
  }
  const seen = new Set();
  for (const [i, id] of dashboard.order.entries()) {
    if (!WIDGET_IDS.includes(id)) errors.push(err(`data.dashboard.order[${i}]`, `unknown widget "${id}"`));
    if (seen.has(id)) errors.push(err(`data.dashboard.order[${i}]`, `duplicate widget "${id}"`));
    seen.add(id);
  }
  if (!Array.isArray(dashboard.hidden)) {
    errors.push(err('data.dashboard.hidden', 'must be an array'));
    return;
  }
  for (const [i, id] of dashboard.hidden.entries()) {
    if (!WIDGET_IDS.includes(id)) errors.push(err(`data.dashboard.hidden[${i}]`, `unknown widget "${id}"`));
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Build a downloadable `.json` file from the current state. */
export function downloadJSON(obj, filename) {
  if (typeof document === 'undefined') return false;
  try {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export function backupFilename(date = new Date()) {
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `lifeos-backup-${stamp}.json`;
}

/** Convenience: export the whole app state as a JSON file download. */
export function triggerBackupDownload(state) {
  return downloadJSON(buildBackup(state), backupFilename());
}

/**
 * Strictly validate a parsed backup object.
 * @returns {{ok: true, data: object} | {ok: false, errors: string[]}}
 */
export function validateBackup(raw) {
  const errors = [];

  if (typeof raw !== 'object' || raw == null || Array.isArray(raw)) {
    return { ok: false, errors: ['The file must contain a JSON object.'] };
  }
  if (raw.app !== 'LifeOS') {
    errors.push('This does not appear to be a LifeOS backup (missing "app": "LifeOS").');
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    errors.push(
      `Unsupported schemaVersion "${String(raw.schemaVersion)}". This build supports version ${SCHEMA_VERSION}.`,
    );
  }

  const data = raw.data;
  if (typeof data !== 'object' || data == null || Array.isArray(data)) {
    errors.push('data: must be an object containing application records.');
    return { ok: false, errors: limit(errors) };
  }

  const requiredArrays = ['tasks', 'habits', 'habitLogs', 'events', 'sessions', 'goals'];
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) errors.push(err(`data.${key}`, 'must be an array'));
  }
  if (errors.length) return { ok: false, errors: limit(errors) };

  const tasks = data.tasks;
  const habits = data.habits;
  const habitLogs = data.habitLogs;
  const events = data.events;
  const sessions = data.sessions;
  const goals = data.goals;

  tasks.forEach((t, i) => validateTask(t, 'data.tasks', errors, i));
  habits.forEach((h, i) => validateHabit(h, 'data.habits', errors, i));
  const knownHabits = new Set(habits.filter((h) => h && isId(h.id)).map((h) => h.id));
  habitLogs.forEach((l, i) => validateHabitLog(l, 'data.habitLogs', errors, i, knownHabits));
  events.forEach((e, i) => validateEvent(e, 'data.events', errors, i));
  sessions.forEach((s, i) => validateSession(s, 'data.sessions', errors, i));
  goals.forEach((g, i) => validateGoal(g, 'data.goals', errors, i));

  checkUniqueIds(tasks, 'data.tasks', errors);
  checkUniqueIds(habits, 'data.habits', errors);
  checkUniqueIds(habitLogs, 'data.habitLogs', errors);
  checkUniqueIds(events, 'data.events', errors);
  checkUniqueIds(sessions, 'data.sessions', errors);
  checkUniqueIds(goals, 'data.goals', errors);

  // Duplicate (habitId, date) completion records would corrupt streak maths.
  const logPairs = new Set();
  habitLogs.forEach((l, i) => {
    if (l && isId(l.habitId) && isDateStr(l.date)) {
      const key = `${l.habitId}@${l.date}`;
      if (logPairs.has(key)) errors.push(err(`data.habitLogs[${i}]`, `duplicate completion for ${key}`));
      logPairs.add(key);
    }
  });

  // Milestone ids must be unique inside their goal.
  goals.forEach((g, i) => {
    if (!g || !Array.isArray(g.milestones)) return;
    const seen = new Set();
    g.milestones.forEach((m, j) => {
      if (m && isId(m.id)) {
        if (seen.has(m.id)) errors.push(err(`data.goals[${i}].milestones[${j}].id`, `duplicate id "${m.id}"`));
        seen.add(m.id);
      }
    });
  });

  if (data.prefs !== undefined) validatePrefs(data.prefs, errors);
  if (data.timer !== undefined) validateTimer(data.timer, errors);
  if (data.dashboard !== undefined) validateDashboard(data.dashboard, errors);

  if (errors.length) return { ok: false, errors: limit(errors) };

  return {
    ok: true,
    data: {
      tasks,
      habits,
      habitLogs,
      events,
      sessions,
      goals,
      prefs: { ...DEFAULT_PREFS, ...(data.prefs || {}) },
      timer: { ...initialTimer(), ...(data.timer || {}) },
      dashboard: sanitizeDashboard(data.dashboard),
    },
  };
}

function limit(errors, max = 12) {
  if (errors.length <= max) return errors;
  return [...errors.slice(0, max), `…and ${errors.length - max} more problem(s).`];
}

function sanitizeDashboard(dashboard) {
  const order = Array.isArray(dashboard?.order)
    ? WIDGET_IDS.filter((id) => dashboard.order.includes(id))
    : DEFAULT_DASHBOARD.order;
  const hidden = Array.isArray(dashboard?.hidden)
    ? dashboard.hidden.filter((id) => WIDGET_IDS.includes(id))
    : [];
  return { order, hidden };
}

/**
 * Lenient loader used for localStorage (and as a final pass after import).
 * Bad records are dropped, missing fields are filled with defaults, and the
 * result is always a structurally valid state object.
 */
export function sanitizeState(raw) {
  const fallback = {
    tasks: [],
    habits: [],
    habitLogs: [],
    events: [],
    sessions: [],
    goals: [],
    prefs: { ...DEFAULT_PREFS },
    timer: initialTimer(),
    dashboard: { ...DEFAULT_DASHBOARD, order: [...DEFAULT_DASHBOARD.order], hidden: [] },
  };
  if (typeof raw !== 'object' || raw == null || Array.isArray(raw)) return fallback;

  const asArray = (v) => (Array.isArray(v) ? v.filter((r) => typeof r === 'object' && r != null && !Array.isArray(r)) : []);

  const tasks = asArray(raw.tasks)
    .filter((t) => isId(t.id) && typeof t.title === 'string' && t.title.trim())
    .map((t) => ({
      id: t.id,
      title: t.title.slice(0, 300),
      description: typeof t.description === 'string' ? t.description : '',
      priority: PRIORITIES.includes(t.priority) ? t.priority : 'Medium',
      dueDate: isDateStr(t.dueDate) ? t.dueDate : null,
      dueTime: isTimeStr(t.dueTime) ? t.dueTime : null,
      category: typeof t.category === 'string' ? t.category : '',
      estimateMin: Number.isFinite(t.estimateMin) && t.estimateMin > 0 ? Math.round(t.estimateMin) : null,
      status: STATUSES.includes(t.status) ? t.status : 'To Do',
      createdAt: Number.isFinite(t.createdAt) ? t.createdAt : null,
      completedAt: Number.isFinite(t.completedAt) ? t.completedAt : null,
    }));

  const habits = asArray(raw.habits)
    .filter((h) => isId(h.id) && typeof h.name === 'string' && h.name.trim() && isDateStr(h.createdAt))
    .map((h) => ({
      id: h.id,
      name: h.name.slice(0, 200),
      description: typeof h.description === 'string' ? h.description : '',
      icon: typeof h.icon === 'string' ? h.icon : 'circle',
      category: typeof h.category === 'string' ? h.category : '',
      schedule: normalizeSchedule(h.schedule),
      createdAt: h.createdAt,
      target: typeof h.target === 'string' ? h.target : '',
      reminder: isTimeStr(h.reminder) ? h.reminder : null,
      archived: h.archived === true,
    }));
  const habitIds = new Set(habits.map((h) => h.id));

  const seenPairs = new Set();
  const habitLogs = asArray(raw.habitLogs)
    .filter((l) => isId(l.id) && habitIds.has(l.habitId) && isDateStr(l.date))
    .filter((l) => {
      const key = `${l.habitId}@${l.date}`;
      if (seenPairs.has(key)) return false;
      seenPairs.add(key);
      return true;
    })
    .map((l) => ({ id: l.id, habitId: l.habitId, date: l.date }));

  const events = asArray(raw.events)
    .filter((e) => isId(e.id) && typeof e.title === 'string' && e.title.trim() && isDateStr(e.date) && isTimeStr(e.start) && isTimeStr(e.end) && e.end > e.start)
    .map((e) => ({
      id: e.id,
      title: e.title.slice(0, 300),
      description: typeof e.description === 'string' ? e.description : '',
      date: e.date,
      start: e.start,
      end: e.end,
      category: EVENT_CATEGORIES.includes(e.category) ? e.category : 'Other',
    }));

  const sessions = asArray(raw.sessions)
    .filter((s) => isId(s.id) && isDateStr(s.date) && Number.isFinite(s.minutes) && s.minutes > 0)
    .map((s) => ({
      id: s.id,
      type: SESSION_TYPES.includes(s.type) ? s.type : 'focus',
      date: s.date,
      startedAt: Number.isFinite(s.startedAt) ? s.startedAt : null,
      endedAt: Number.isFinite(s.endedAt) ? s.endedAt : null,
      minutes: Math.max(1, Math.round(s.minutes)),
      taskId: isId(s.taskId) ? s.taskId : null,
    }));

  const goals = asArray(raw.goals)
    .filter((g) => isId(g.id) && typeof g.title === 'string' && g.title.trim() && Array.isArray(g.milestones))
    .map((g) => ({
      id: g.id,
      title: g.title.slice(0, 300),
      description: typeof g.description === 'string' ? g.description : '',
      targetDate: isDateStr(g.targetDate) ? g.targetDate : null,
      category: typeof g.category === 'string' ? g.category : '',
      createdAt: Number.isFinite(g.createdAt) ? g.createdAt : null,
      milestones: asArray(g.milestones)
        .filter((m) => isId(m.id) && typeof m.title === 'string' && m.title.trim())
        .map((m) => ({
          id: m.id,
          title: m.title.slice(0, 300),
          description: typeof m.description === 'string' ? m.description : '',
          done: m.done === true,
        })),
    }));

  const prefs = { ...DEFAULT_PREFS };
  if (typeof raw.prefs === 'object' && raw.prefs && !Array.isArray(raw.prefs)) {
    if (raw.prefs.theme === 'light' || raw.prefs.theme === 'dark') prefs.theme = raw.prefs.theme;
    for (const key of ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'dailyFocusGoalMin', 'pomodoroCycles', 'weekStartsOn']) {
      const v = raw.prefs[key];
      if (Number.isInteger(v) && v > 0) prefs[key] = v;
    }
    if (typeof raw.prefs.soundEnabled === 'boolean') prefs.soundEnabled = raw.prefs.soundEnabled;
  }

  const baseTimer = initialTimer();
  let timer = { ...baseTimer };
  if (typeof raw.timer === 'object' && raw.timer && !Array.isArray(raw.timer)) {
    const t = raw.timer;
    if (TIMER_STATUS.includes(t.status)) timer.status = t.status;
    if (SESSION_TYPES.includes(t.sessionType)) timer.sessionType = t.sessionType;
    if (Number.isFinite(t.durationMs) && t.durationMs > 0) timer.durationMs = t.durationMs;
    if (Number.isFinite(t.elapsedMs) && t.elapsedMs >= 0) timer.elapsedMs = Math.min(t.elapsedMs, timer.durationMs);
    if (Number.isFinite(t.startedAt)) timer.startedAt = t.startedAt;
    if (isId(t.sessionId)) timer.sessionId = t.sessionId;
    if (isId(t.taskId)) timer.taskId = t.taskId;
    if (Number.isFinite(t.completedAt)) timer.completedAt = t.completedAt;
    if (isId(t.completedSessionId)) timer.completedSessionId = t.completedSessionId;
    if (timer.status === 'running' && !timer.startedAt) timer.status = 'paused';
    if (timer.status === 'running' && timer.elapsedMs >= timer.durationMs) {
      // A stale running timer that already elapsed: park it as paused so the
      // app can complete it exactly once on mount instead of looping.
      timer.status = 'paused';
    }
  }

  return {
    tasks,
    habits,
    habitLogs,
    events,
    sessions,
    goals,
    prefs,
    timer,
    dashboard: sanitizeDashboard(raw.dashboard),
  };
}

function normalizeSchedule(schedule) {
  if (schedule === 'daily') return 'daily';
  if (Array.isArray(schedule)) {
    const days = [...new Set(schedule.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    if (days.length === 0) return 'daily';
    if (days.length === 7) return 'daily';
    return days;
  }
  return 'daily';
}

/** Parse strict JSON text; returns null with a message on failure. */
export function parseBackupText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, errors: ['The selected file is empty.'] };
  }
  try {
    const parsed = JSON.parse(text);
    return { ok: true, value: parsed };
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${e.message}`] };
  }
}
