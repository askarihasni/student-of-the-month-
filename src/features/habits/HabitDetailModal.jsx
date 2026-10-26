import { Pencil, Repeat, Sparkles, Flame, CalendarCheck, Target } from 'lucide-react';
import Modal from '../../components/common/Modal.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import HabitHeatmap from './HabitHeatmap.jsx';
import { habitIcon, WEEKDAY_SHORT } from './habitIcons.js';
import { useApp } from '../../context/AppContext.jsx';
import { habitStats } from '../../state/selectors.js';
import { formatMediumDate, todayStr } from '../../utils/dates.js';
import { goalStatusTone } from '../../data/tones.js';

function scheduleLabel(habit) {
  if (habit.schedule === 'daily') return 'Every day';
  if (Array.isArray(habit.schedule)) {
    if (habit.schedule.length === 5 && [1, 2, 3, 4, 5].every((d) => habit.schedule.includes(d))) return 'Weekdays (Mon–Fri)';
    if (habit.schedule.length === 2 && habit.schedule.includes(0) && habit.schedule.includes(6)) return 'Weekends';
    return habit.schedule.map((d) => WEEKDAY_SHORT[d]).join(', ');
  }
  return 'Every day';
}

/** Detailed history view: streaks, rates, editable contribution heatmap. */
export default function HabitDetailModal({ open, onClose, habit, onEdit, onToggleDate }) {
  const { state } = useApp();
  if (!habit) return null;

  const stats = habitStats(state, habit);
  const Icon = habitIcon(habit.icon);
  const archivedTone = habit.archived ? goalStatusTone.overdue : goalStatusTone.active;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={habit.name}
      description={habit.description || 'Completion history and streak statistics.'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={() => { onClose(); onEdit?.(habit); }}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit habit
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {scheduleLabel(habit)}
          </span>
          {habit.category ? <span className="chip">{habit.category}</span> : null}
          {habit.target ? <span className="chip">Target: {habit.target}</span> : null}
          {habit.reminder ? <span className="chip">Reminder {habit.reminder}</span> : null}
          <span className={`chip ${archivedTone === 'danger' ? 'text-danger' : ''}`}>
            {habit.archived ? 'Archived' : 'Active'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Flame} tone="text-warning" label="Current streak" value={`${stats.current}d`} />
          <Stat icon={Sparkles} tone="text-accent" label="Longest streak" value={`${stats.longest}d`} />
          <Stat icon={CalendarCheck} tone="text-info" label="Last 7 days" value={`${stats.week.rate}%`} />
          <Stat icon={Target} tone="text-success" label="Last 30 days" value={`${stats.month.rate}%`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <ProgressBar
              value={stats.week.scheduled ? stats.week.rate : null}
              tone="accent"
              label="Weekly completion"
            />
            <p className="mt-1.5 text-xs text-muted">
              {stats.week.completed} of {stats.week.scheduled} scheduled days completed.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <ProgressBar
              value={stats.month.scheduled ? stats.month.rate : null}
              tone="success"
              label="Monthly completion"
            />
            <p className="mt-1.5 text-xs text-muted">
              {stats.month.completed} of {stats.month.scheduled} scheduled days completed.
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="section-title">History</h3>
            <span className="text-xs text-muted">Created {formatMediumDate(habit.createdAt)}</span>
          </div>
          <HabitHeatmap habit={habit} habitLogs={state.habitLogs} onToggleDate={onToggleDate} />
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-surface-2 p-2.5 text-xs leading-relaxed text-muted">
            <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-text">Streak rule:</strong> only scheduled days count. Rest days
              never break a streak, a missed scheduled day does, future days are never counted as missed, and today
              stays pending until you complete it (or the day ends). You can click any scheduled day up to{' '}
              {formatMediumDate(todayStr())} to correct history.
            </span>
          </p>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight text-text tabular-nums">{value}</p>
    </div>
  );
}
