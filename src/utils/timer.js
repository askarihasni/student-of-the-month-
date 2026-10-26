/**
 * Focus timer math.
 *
 * The timer never counts down once per interval. It stores the session
 * `durationMs`, the epoch `startedAt` of the current running stretch and the
 * `elapsedMs` accumulated by *previous* stretches (before pause). Remaining
 * time is always derived from the wall clock, so a throttled or backgrounded
 * tab — or a refresh — still produces the correct value.
 *
 *   elapsed = elapsedMs + (running ? now - startedAt : 0)
 *   remaining = max(0, durationMs - elapsed)
 */

export const TIMER_STATUS = ['idle', 'running', 'paused', 'completed'];
export const SESSION_TYPES = ['focus', 'short', 'long'];

export function initialTimer() {
  return {
    status: 'idle', // idle | running | paused | completed
    sessionType: 'focus', // focus | short | long
    durationMs: 25 * 60 * 1000,
    elapsedMs: 0, // accumulated by finished (paused) stretches
    startedAt: null, // epoch ms of the running stretch
    sessionId: null, // stable id for the current attempt
    taskId: null, // optional linked task
    completedAt: null, // epoch ms when the session completed
    completedSessionId: null, // id of the session record created on completion
  };
}

/** Elapsed milliseconds for a timer state at `nowMs`. */
export function timerElapsed(timer, nowMs = Date.now()) {
  if (!timer) return 0;
  const base = Number.isFinite(timer.elapsedMs) ? Math.max(0, timer.elapsedMs) : 0;
  if (timer.status === 'running' && timer.startedAt) {
    const stretch = Math.max(0, nowMs - timer.startedAt);
    return base + stretch;
  }
  return base;
}

export function timerRemaining(timer, nowMs = Date.now()) {
  if (!timer) return 0;
  return Math.max(0, timer.durationMs - timerElapsed(timer, nowMs));
}

export function timerProgress(timer, nowMs = Date.now()) {
  if (!timer || !timer.durationMs) return 0;
  return Math.min(100, Math.max(0, (timerElapsed(timer, nowMs) / timer.durationMs) * 100));
}

export function isTimerDone(timer, nowMs = Date.now()) {
  return !!timer && timer.durationMs > 0 && timerRemaining(timer, nowMs) <= 0;
}

/** `24:59` style label from milliseconds. */
export function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
