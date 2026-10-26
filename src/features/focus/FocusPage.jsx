import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, ListChecks, Pause, Play, RotateCcw, Timer, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Segmented from '../../components/common/Segmented.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { formatMs, timerElapsed, timerProgress, timerRemaining } from '../../utils/timer.js';
import { focusGoal, openTasks } from '../../state/selectors.js';
import { createId } from '../../utils/id.js';
import { formatDuration, formatShortDate, todayStr } from '../../utils/dates.js';

const TYPE_LABELS = { focus: 'Focus', short: 'Short break', long: 'Long break' };

/** Duration (ms) for a session type, sourced from preferences. */
function durationFor(prefs, sessionType) {
  const minutes =
    sessionType === 'focus'
      ? prefs.focusMinutes
      : sessionType === 'short'
        ? prefs.shortBreakMinutes
        : prefs.longBreakMinutes;
  return Math.max(1, minutes) * 60000;
}

/** Local `now` tick — only runs while the timer is active. */
function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export default function FocusPage() {
  const { state, dispatch, toast } = useApp();
  const { timer, prefs } = state;
  const active = timer.status === 'running';
  const now = useNow(active || timer.status === 'paused');

  const [taskId, setTaskId] = useState(timer.taskId ?? '');
  const [confirmClear, setConfirmClear] = useState(null); // session id or 'all'

  // Keep the picker in sync when a linked task is deleted elsewhere.
  useEffect(() => {
    if (taskId && !state.tasks.some((t) => t.id === taskId)) setTaskId('');
  }, [state.tasks, taskId]);

  const remaining = timerRemaining(timer, now);
  const elapsed = timerElapsed(timer, now);
  const progress = timerProgress(timer, now);
  const done = timer.status === 'completed';

  const tasks = useMemo(() => openTasks(state), [state]);
  const focus = focusGoal(state);
  const today = todayStr();
  const todaySessions = state.sessions.filter((s) => s.date === today);
  const history = [...state.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 12);

  /* ------------------------------- actions ------------------------------ */
  const startTimer = () => {
    const chosenTask = tasks.some((t) => t.id === taskId) ? taskId : '';
    dispatch({
      type: 'TIMER_START',
      sessionType: 'focus',
      durationMs: durationFor(prefs, 'focus'),
      sessionId: createId(),
      taskId: chosenTask || null,
    });
    toast('Focus session started — timer survives refresh.', 'success');
  };

  const pause = () => dispatch({ type: 'TIMER_PAUSE' });
  const resume = () => dispatch({ type: 'TIMER_RESUME' });

  const resetTimer = () => {
    dispatch({ type: 'TIMER_RESET', sessionType: 'focus', durationMs: durationFor(prefs, 'focus') });
    toast('Timer reset — no session was recorded.', 'info');
  };

  const startBreak = (type) => {
    dispatch({ type: 'TIMER_START', sessionType: type, durationMs: durationFor(prefs, type), sessionId: createId(), taskId: null });
    toast(`${TYPE_LABELS[type]} started.`, 'success');
  };

  const linkTask = (e) => {
    const next = e.target.value;
    setTaskId(next);
    if (timer.status !== 'idle') dispatch({ type: 'TIMER_SET_TASK', taskId: next || null });
  };

  const deleteSession = () => {
    if (!confirmClear) return;
    if (confirmClear === 'all') {
      for (const s of state.sessions) dispatch({ type: 'SESSION_DELETE', id: s.id });
      toast('Focus history cleared.', 'info');
    } else {
      dispatch({ type: 'SESSION_DELETE', id: confirmClear });
      toast('Session removed. Press Ctrl+Z to undo.', 'info');
    }
    setConfirmClear(null);
  };

  const circumference = 2 * Math.PI * 118;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <>
      <PageHeader
        title="Focus"
        description="Timestamp-based Pomodoro timer — pausing, refreshing or backgrounding the tab never loses or double-counts time."
        actions={
          <Segmented
            ariaLabel="Session type"
            value={timer.sessionType === 'focus' ? 'focus' : timer.sessionType}
            onChange={(v) => {
              if (timer.status === 'running') return;
              dispatch({ type: 'TIMER_CONFIG', sessionType: v, durationMs: durationFor(prefs, v) });
            }}
            options={[
              { value: 'focus', label: `${prefs.focusMinutes}m focus` },
              { value: 'short', label: `${prefs.shortBreakMinutes}m break` },
              { value: 'long', label: `${prefs.longBreakMinutes}m long` },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        {/* ------------------------------ timer ----------------------------- */}
        <section className="card flex flex-col items-center gap-5 p-6 sm:p-8" aria-label="Focus timer">
          <div className="relative grid h-64 w-64 place-items-center sm:h-72 sm:w-72">
            <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="130" cy="130" r="118" fill="none" strokeWidth="10" className="stroke-surface-3" />
              <circle
                cx="130"
                cy="130"
                r="118"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className={done ? 'stroke-success' : 'stroke-accent'}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 300ms linear' }}
              />
            </svg>
            <div className="text-center">
              <p className="text-xs font-semibold tracking-widest text-faint uppercase">
                {TYPE_LABELS[timer.sessionType]}
                {timer.sessionType !== 'focus' ? ' (not recorded)' : ''}
              </p>
              <p
                className="mt-1 text-5xl font-semibold tracking-tight text-text tabular-nums"
                role="timer"
                aria-live="off"
              >
                {formatMs(done ? 0 : remaining)}
              </p>
              <p className="mt-1.5 text-xs text-muted">
                {timer.status === 'idle'
                  ? 'Ready when you are'
                  : done
                    ? 'Session complete'
                    : timer.status === 'paused'
                      ? `Paused · ${formatMs(timer.durationMs - elapsed)} left`
                      : `${Math.round(progress)}% elapsed`}
              </p>
            </div>
          </div>

          {/* controls */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {timer.status === 'idle' ? (
              <button type="button" className="btn btn-primary" onClick={startTimer}>
                <Play className="h-4 w-4" aria-hidden="true" />
                Start {prefs.focusMinutes}-minute focus
              </button>
            ) : timer.status === 'running' ? (
              <>
                <button type="button" className="btn btn-primary" onClick={pause}>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  Pause
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetTimer}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reset
                </button>
              </>
            ) : timer.status === 'paused' ? (
              <>
                <button type="button" className="btn btn-primary" onClick={resume}>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Resume
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetTimer}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reset
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-primary" onClick={() => startBreak('short')}>
                  Start short break
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => startBreak('long')}>
                  Start long break
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetTimer}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  New focus session
                </button>
              </>
            )}
          </div>

          {timer.sessionType === 'focus' ? (
            <label className="w-full max-w-sm">
              <span className="label">Link to a task (optional)</span>
              <select className="select" value={taskId} onChange={linkTask} disabled={done}>
                <option value="">No linked task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <p className="max-w-md text-center text-xs leading-relaxed text-faint">
            Time is computed from stored timestamps (<code>elapsed = stored + (now − startedAt)</code>), so a
            refresh, throttled background tab or closed laptop still lands on the right value. Completion is
            recorded exactly once — the session id must match and an existing record is never duplicated.
          </p>
        </section>

        {/* --------------------------- side column -------------------------- */}
        <div className="space-y-4">
          <section className="card p-4 sm:p-5" aria-label="Daily focus goal">
            <h2 className="section-title">Today's goal</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-text tabular-nums">
              {formatDuration(focus.minutes)}
            </p>
            <p className="text-xs text-muted">of {formatDuration(focus.goal)} target</p>
            <ProgressBar
              className="mt-3"
              value={focus.percent}
              tone={focus.percent >= 100 ? 'success' : 'accent'}
            />
            {focus.percent >= 100 ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Daily goal reached — anything else is a bonus.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">
                {formatDuration(Math.max(0, focus.goal - focus.minutes))} to go — only completed focus sessions
                count.
              </p>
            )}
          </section>

          <section className="card p-4 sm:p-5" aria-label="Focus settings">
            <h2 className="section-title">Session lengths</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Durations are configured in Settings ({prefs.focusMinutes}m focus · {prefs.shortBreakMinutes}m
              short · {prefs.longBreakMinutes}m long). Only focus sessions are written to history and analytics;
              breaks are counted down but never recorded.
            </p>
          </section>

          <section className="card p-4 sm:p-5" aria-label="Today at a glance">
            <h2 className="section-title">Today</h2>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <Timer className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  Sessions
                </span>
                <span className="font-semibold text-text tabular-nums">{todaySessions.length}</span>
              </li>
              <li className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <CircleCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  Focused
                </span>
                <span className="font-semibold text-text tabular-nums">
                  {formatDuration(todaySessions.reduce((sum, s) => sum + (s.minutes || 0), 0))}
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* ------------------------------ history ----------------------------- */}
      <section className="mt-5" aria-label="Session history">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Recent sessions</h2>
          {history.length > 0 ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmClear('all')}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear history
            </button>
          ) : null}
        </div>

        {history.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="No focus sessions yet"
            description="Completed focus sessions appear here with their task link, and feed the analytics charts."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {history.map((s) => {
              const task = state.tasks.find((t) => t.id === s.taskId);
              return (
                <li key={s.id} className="card flex items-center gap-3 p-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Timer className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {formatDuration(s.minutes)} focus session
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatShortDate(s.date)}
                      {task ? ` · ${task.title}` : ''}
                    </p>
                  </div>
                  {task ? <Badge tone="accent">Linked</Badge> : null}
                  <button
                    type="button"
                    className="btn-icon-sm text-faint hover:text-danger"
                    onClick={() => setConfirmClear(s.id)}
                    aria-label={`Delete session from ${s.date}`}
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {state.tasks.length === 0 ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            Create a task to link focus sessions to specific work.
          </p>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmClear !== null}
        danger
        title={confirmClear === 'all' ? 'Clear all focus history?' : 'Delete this session?'}
        message={
          confirmClear === 'all'
            ? 'Every completed focus session will be removed and analytics will be recalculated from the remaining data. You can undo this right afterwards with Ctrl+Z.'
            : 'This session will be removed from your history and analytics. You can undo this right afterwards with Ctrl+Z.'
        }
        confirmLabel={confirmClear === 'all' ? 'Clear history' : 'Delete session'}
        onConfirm={deleteSession}
        onCancel={() => setConfirmClear(null)}
      />
    </>
  );
}
