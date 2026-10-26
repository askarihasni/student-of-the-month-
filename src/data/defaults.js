/** Application-wide constants and default preferences. */

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'lifeos.state.v1';
export const THEME_KEY = 'lifeos.theme';

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const STATUSES = ['To Do', 'In Progress', 'Completed'];
export const EVENT_CATEGORIES = ['Work', 'Personal', 'Health', 'Study', 'Meeting', 'Other'];

export const SETTINGS_LIMITS = {
  focusMinutes: { min: 5, max: 180 },
  shortBreakMinutes: { min: 1, max: 60 },
  longBreakMinutes: { min: 1, max: 90 },
  dailyFocusGoalMin: { min: 10, max: 720 },
  pomodoroCycles: { min: 2, max: 12 },
};

export const DEFAULT_PREFS = {
  theme: 'dark',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  dailyFocusGoalMin: 120,
  pomodoroCycles: 4,
  weekStartsOn: 0, // 0 = Sunday
  soundEnabled: true,
};

/** Every dashboard widget id, in the default display order. */
export const WIDGET_IDS = [
  'summary',
  'dailyProgress',
  'agenda',
  'weeklyChart',
  'upcoming',
  'habits',
  'goals',
  'focus',
];

export const DEFAULT_DASHBOARD = {
  order: WIDGET_IDS,
  hidden: [],
};

export const WIDGET_LABELS = {
  summary: 'Summary cards',
  dailyProgress: 'Daily completion',
  agenda: "Today's agenda",
  weeklyChart: 'Weekly productivity',
  upcoming: 'Upcoming tasks',
  habits: 'Habits today',
  goals: 'Goal progress',
  focus: 'Focus time',
};

/** Validate a numeric preference against its limits. */
export function validateNumericSetting(key, value) {
  const limit = SETTINGS_LIMITS[key];
  if (!limit) return { ok: false, error: 'Unknown setting.' };
  const n = Number(value);
  if (!Number.isFinite(n)) return { ok: false, error: 'Enter a number.' };
  if (!Number.isInteger(n)) return { ok: false, error: 'Enter a whole number.' };
  if (n < limit.min || n > limit.max) {
    return { ok: false, error: `Must be between ${limit.min} and ${limit.max}.` };
  }
  return { ok: true, value: n };
}
