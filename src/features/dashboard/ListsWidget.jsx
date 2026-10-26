import { useNavigate } from 'react-router-dom';
import { CalendarDays, CircleCheck, Flame, ListChecks, Play, Plus, Target, Timer } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { goalStatusTone, priorityTone } from '../../data/tones.js';
import {
  dailyCompletion,
  focusGoal,
  habitSummary,
  goalSummaries,
  upcomingTasks,
} from '../../state/selectors.js';
import { habitsScheduledOn } from '../../utils/streaks.js';
import { formatDuration, relativeDayLabel, todayStr } from '../../utils/dates.js';
import { createId } from '../../utils/id.js';
import { cn } from '../../utils/cn.js';

/* ------------------------------------------------------------------ */
/* Daily completion ring                                               */
/* ------------------------------------------------------------------ */
export function DailyProgressWidget() {
  const { state } = useApp();
  const today = todayStr();
  const completion = dailyCompletion(state, today);

  const planTasks = state.tasks.filter((t) => t.dueDate && t.dueDate <= today);
  const tasksDone = planTasks.filter((t) => t.status === 'Completed').length;
  const habits = habitsScheduledOn(state.habits, state.habitLogs, today);
  const habitsDone = habits.filter((h) => h.completed).length;

  if (completion.total === 0) {
    return (
      <EmptyState
        compact
        icon={Target}
        title="Nothing scheduled yet"
        description="Add tasks with due dates or habits scheduled for today to see your daily completion."
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => (window.location.hash = '#/tasks?new=1')}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add a task
          </button>
        }
      />
    );
  }

  const pct = completion.value ?? 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div
        className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(var(--accent) ${pct}%, var(--surface-3) ${Math.max(pct, 0.001)}%)` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Daily completion ${pct} percent`}
      >
        <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-surface">
          <div className="text-center">
            <p className="text-2xl font-semibold tracking-tight text-text tabular-nums">{pct}%</p>
            <p className="text-[0.65rem] text-faint">complete</p>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 space-y-3">
        <Row
          icon={ListChecks}
          label="Tasks due today or overdue"
          done={tasksDone}
          total={planTasks.length}
        />
        <Row icon={CircleCheck} label="Habits scheduled today" done={habitsDone} total={habits.length} />
        <p className="text-xs text-muted">
          {completion.done} of {completion.total} planned items done — plan = tasks due today or overdue + habits
          scheduled today.
        </p>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, done, total }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-muted">
          <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
          {label}
        </span>
        <span className="font-semibold text-text tabular-nums">
          {done}/{total}
        </span>
      </div>
      <ProgressBar value={total ? (done / total) * 100 : null} showValue={false} tone={done === total ? 'success' : 'accent'} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming tasks                                                      */
/* ------------------------------------------------------------------ */
export function UpcomingTasksWidget() {
  const { state } = useApp();
  const navigate = useNavigate();
  const upcoming = upcomingTasks(state, 5);

  if (upcoming.length === 0) {
    return (
      <EmptyState
        compact
        icon={CalendarDays}
        title="No upcoming deadlines"
        description="Tasks with due dates will appear here, sorted by how soon they're due."
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks?new=1')}>
            New task
          </button>
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {upcoming.map((task) => {
        const overdue = task.dueDate < todayStr();
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-surface-3',
                overdue ? 'border-danger/35 bg-danger-soft/40' : 'border-line bg-surface-2',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">{task.title}</span>
                <span className={cn('text-xs', overdue ? 'font-semibold text-danger' : 'text-muted')}>
                  {relativeDayLabel(task.dueDate)}
                  {task.dueTime ? ` at ${task.dueTime}` : ''}
                  {overdue ? ' · overdue' : ''}
                </span>
              </span>
              <Badge tone={priorityTone[task.priority]}>{task.priority}</Badge>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Habits today (with quick check-in)                                  */
/* ------------------------------------------------------------------ */
export function HabitsWidget() {
  const { state, dispatch, toast } = useApp();
  const today = todayStr();
  const summary = habitSummary(state, today);

  const toggle = (habitId, name, done) => {
    dispatch({ type: 'HABIT_LOG_TOGGLE', habitId, date: today, logId: createId() });
    toast(done ? 'Check-in removed.' : `${name} completed for today!`, 'success');
  };

  if (summary.scheduled.length === 0) {
    return (
      <EmptyState
        compact
        icon={Flame}
        title="No habits scheduled today"
        description="Rest day, or create a habit to start building a streak."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {summary.scheduled.map(({ habit, completed }) => (
        <li
          key={habit.id}
          className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2"
        >
          <span className="min-w-0 flex-1">
            <span className={cn('block truncate text-sm font-medium', completed ? 'text-muted line-through' : 'text-text')}>
              {habit.name}
            </span>
            {habit.target ? <span className="text-xs text-faint">Target: {habit.target}</span> : null}
          </span>
          <button
            type="button"
            onClick={() => toggle(habit.id, habit.name, completed)}
            aria-pressed={completed}
            aria-label={completed ? `Undo check-in for ${habit.name}` : `Complete ${habit.name} for today`}
            className={cn(
              'btn btn-sm cursor-pointer',
              completed ? 'btn-secondary text-success' : 'btn-primary',
            )}
          >
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {completed ? 'Done' : 'Check in'}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */
export function GoalsWidget() {
  const { state } = useApp();
  const navigate = useNavigate();
  const summaries = goalSummaries(state).slice(0, 4);

  if (summaries.length === 0) {
    return (
      <EmptyState
        compact
        icon={Target}
        title="No goals yet"
        description="Set a goal and add milestones — progress is calculated automatically."
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/goals?new=1')}>
            New goal
          </button>
        }
      />
    );
  }

  return (
    <ul className="space-y-3.5">
      {summaries.map(({ goal, progress, status, counts }) => (
        <li key={goal.id}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/goals')}
              className="min-w-0 cursor-pointer truncate text-left text-sm font-medium text-text hover:text-accent"
            >
              {goal.title}
            </button>
            <Badge tone={goalStatusTone[status]} className="shrink-0">
              {status === 'overdue' ? 'Overdue' : status === 'completed' ? 'Done' : 'Active'}
            </Badge>
          </div>
          <ProgressBar
            value={progress}
            tone={status === 'overdue' ? 'danger' : status === 'completed' ? 'success' : 'accent'}
            showValue={false}
          />
          <p className="mt-1 text-xs text-muted">
            {counts.total === 0
              ? 'No milestones yet — add some to start tracking progress'
              : `${counts.done}/${counts.total} milestones completed`}
            {goal.targetDate ? ` · due ${relativeDayLabel(goal.targetDate)}` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Focus time                                                          */
/* ------------------------------------------------------------------ */
export function FocusWidget() {
  const { state } = useApp();
  const navigate = useNavigate();
  const focus = focusGoal(state);
  const today = todayStr();
  const sessionsToday = state.sessions.filter((s) => s.date === today && s.type === 'focus');

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-text tabular-nums">
            {formatDuration(focus.minutes)}
          </p>
          <p className="text-xs text-muted">of {formatDuration(focus.goal)} daily goal</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/focus')}>
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Start focus
        </button>
      </div>

      <ProgressBar
        value={focus.percent}
        tone={focus.percent >= 100 ? 'success' : 'accent'}
        label={`${sessionsToday.length} session${sessionsToday.length === 1 ? '' : 's'} today`}
      />

      {sessionsToday.length > 0 ? (
        <ul className="space-y-1.5">
          {sessionsToday.slice(0, 3).map((s) => {
            const linked = state.tasks.find((t) => t.id === s.taskId);
            return (
              <li key={s.id} className="flex items-center gap-2 text-xs text-muted">
                <Timer className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="truncate">
                  {formatDuration(s.minutes)} · {linked ? linked.title : 'Unlinked session'}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted">No focus sessions completed yet today.</p>
      )}
    </div>
  );
}
