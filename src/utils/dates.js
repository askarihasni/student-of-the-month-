/**
 * Local-time date utilities.
 *
 * Calendar dates are stored as `YYYY-MM-DD` strings and are parsed with local
 * Date components so a date-only value can never shift across a UTC boundary.
 * Timestamps (moments in time) are stored as epoch milliseconds.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when `value` is a well-formed `YYYY-MM-DD` string. */
export function isDateStr(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** `YYYY-MM-DD` for "right now" in the user's local time zone. */
export function todayStr() {
  return toDateStr(new Date());
}

/** Convert a Date to a local `YYYY-MM-DD` string. */
export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse `YYYY-MM-DD` into a local Date at midnight. Returns null if invalid. */
export function parseDateStr(value) {
  if (!isDateStr(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add (or subtract) days to a date string. Returns a new `YYYY-MM-DD`. */
export function addDays(dateStr, amount) {
  const dt = parseDateStr(dateStr);
  if (!dt) return dateStr;
  dt.setDate(dt.getDate() + amount);
  return toDateStr(dt);
}

/** Add (or subtract) months, clamping the day of month. */
export function addMonths(dateStr, amount) {
  const dt = parseDateStr(dateStr);
  if (!dt) return dateStr;
  const day = dt.getDate();
  dt.setDate(1);
  dt.setMonth(dt.getMonth() + amount);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(day, last));
  return toDateStr(dt);
}

/** Day of week for a date string: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(dateStr) {
  const dt = parseDateStr(dateStr);
  return dt ? dt.getDay() : 0;
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a, b) {
  const da = parseDateStr(a);
  const db = parseDateStr(b);
  if (!da || !db) return 0;
  return Math.round((db - da) / 86400000);
}

/** Sunday-start week containing `dateStr`, as 7 date strings. */
export function weekOf(dateStr) {
  const start = addDays(dateStr, -dayOfWeek(dateStr));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Six Sunday-start weeks forming a month grid (42 date strings). */
export function monthGrid(dateStr) {
  const dt = parseDateStr(dateStr);
  if (!dt) return [];
  const first = new Date(dt.getFullYear(), dt.getMonth(), 1);
  const gridStart = toDateStr(addDays(toDateStr(first), -first.getDay()));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** `HH:MM` (24h) for the current wall-clock time. */
export function nowTimeStr(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isTimeStr(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

/** Convert `HH:MM` to minutes since midnight (NaN when invalid). */
export function timeToMinutes(value) {
  if (!isTimeStr(value)) return NaN;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight to `HH:MM`. */
export function minutesToTime(minutes) {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/** Human time like `9:05 AM`. */
export function formatTime(value) {
  if (!isTimeStr(value)) return '';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `Friday, October 16, 2026` */
export function formatLongDate(dateStr) {
  const dt = parseDateStr(dateStr);
  if (!dt) return '';
  return `${DAY_LONG[dt.getDay()]}, ${MONTH_LONG[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/** `Fri, Oct 16` */
export function formatShortDate(dateStr) {
  const dt = parseDateStr(dateStr);
  if (!dt) return '';
  return `${DAY_SHORT[dt.getDay()]}, ${MONTH_SHORT[dt.getMonth()]} ${dt.getDate()}`;
}

/** `Oct 16, 2026` */
export function formatMediumDate(dateStr) {
  const dt = parseDateStr(dateStr);
  if (!dt) return '';
  return `${MONTH_SHORT[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/** `Friday, Oct 16` — used for calendar day headers. */
export function formatWeekdayDate(dateStr) {
  const dt = parseDateStr(dateStr);
  if (!dt) return '';
  return `${DAY_SHORT[dt.getDay()]}, ${MONTH_SHORT[dt.getMonth()]} ${dt.getDate()}`;
}

export function weekdayLongName(dayIndex) {
  return DAY_LONG[((dayIndex % 7) + 7) % 7];
}

/** Relative label such as `Today`, `Tomorrow`, `Yesterday`, or `in 5 days`. */
export function relativeDayLabel(dateStr) {
  const diff = daysBetween(todayStr(), dateStr);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff < 7) return `in ${diff} days`;
  return formatMediumDate(dateStr);
}

/** Human duration such as `2h 30m` / `45m`. */
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Greeting based on the hour of day. */
export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
