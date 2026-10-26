import { Link } from 'react-router-dom';
import { ListChecks, Repeat, Target, Timer } from 'lucide-react';
import { formatDuration } from '../../utils/dates.js';

const TONES = {
  tasks: 'bg-accent-soft text-accent',
  habits: 'bg-success-soft text-success',
  goals: 'bg-warning-soft text-warning',
  focus: 'bg-info-soft text-info',
};

/** Four headline metrics, each linking to its module. All values are derived live. */
export default function SummaryCards({ stats }) {
  const habitPercent = stats.habits.percent;

  const cards = [
    {
      key: 'tasks',
      to: '/tasks',
      label: 'Open tasks',
      value: String(stats.tasks.open),
      sub:
        stats.tasks.overdue > 0
          ? `${stats.tasks.doneToday} done today · ${stats.tasks.overdue} overdue`
          : `${stats.tasks.doneToday} done today · ${stats.tasks.dueToday} due today`,
      icon: ListChecks,
      iconLabel: 'Tasks',
    },
    {
      key: 'habits',
      to: '/habits',
      label: 'Habits today',
      value: stats.habits.total ? `${stats.habits.done}/${stats.habits.total}` : '—',
      sub: stats.habits.total
        ? habitPercent === 100
          ? 'All scheduled habits completed'
          : `${habitPercent}% complete · ${stats.habits.active} active habits`
        : 'Nothing scheduled today',
      icon: Repeat,
      iconLabel: 'Habits',
    },
    {
      key: 'goals',
      to: '/goals',
      label: 'Active goals',
      value: String(stats.goals.active),
      sub:
        stats.goals.total === 0
          ? 'No goals yet'
          : `${stats.goals.completed} completed · ${stats.goals.overdue} overdue`,
      icon: Target,
      iconLabel: 'Goals',
    },
    {
      key: 'focus',
      to: '/focus',
      label: 'Focus today',
      value: formatDuration(stats.focus.minutes),
      sub:
        stats.focus.minutes >= stats.focus.goal
          ? `Daily goal of ${formatDuration(stats.focus.goal)} reached`
          : `${stats.focus.percent}% of ${formatDuration(stats.focus.goal)} goal`,
      icon: Timer,
      iconLabel: 'Focus',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.key}
          to={card.to}
          className="card card-hover group flex min-w-0 items-start gap-3.5 p-4 transition-all hover:-translate-y-0.5"
        >
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONES[card.key]}`} aria-hidden="true">
            <card.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">{card.label}</p>
            <p className="stat-value mt-0.5">{card.value}</p>
            <p className="mt-0.5 truncate text-xs text-faint">{card.sub}</p>
          </div>
          <span className="sr-only">Open {card.label}</span>
        </Link>
      ))}
    </div>
  );
}
