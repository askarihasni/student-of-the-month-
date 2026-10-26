import { Archive, ArchiveRestore, CircleCheck, Ellipsis, Flame, Pencil, Sparkles, Trash, CalendarCheck } from 'lucide-react';
import Menu, { MenuItem, MenuSeparator } from '../../components/common/Menu.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { cn } from '../../utils/cn.js';
import { habitIcon, WEEKDAY_SHORT } from './habitIcons.js';
import { isScheduledOn } from '../../utils/streaks.js';
import { todayStr } from '../../utils/dates.js';

/**
 * Habit card for the selected date: completion toggle plus live streak/rate
 * statistics derived from dated completion records.
 */
export default function HabitCard({ habit, date, completed, stats, onToggle, onEdit, onArchive, onDelete, onDetail }) {
  const today = todayStr();
  const Icon = habitIcon(habit.icon);
  const scheduled = isScheduledOn(habit, date);
  const future = date > today;
  const editable = scheduled && !future;

  const scheduleText =
    habit.schedule === 'daily'
      ? 'Daily'
      : Array.isArray(habit.schedule)
        ? habit.schedule.map((d) => WEEKDAY_SHORT[d]).join(' · ')
        : 'Daily';

  return (
    <article
      className={cn(
        'card card-hover flex flex-col p-4',
        completed && scheduled && 'border-success/30',
        !scheduled && 'opacity-80',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl border',
            completed && scheduled
              ? 'border-success/30 bg-success-soft text-success'
              : 'border-line bg-surface-3 text-accent',
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-text">{habit.name}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <CalendarCheck className="h-3 w-3" aria-hidden="true" />
                  {scheduleText}
                </span>
                {habit.category ? <span className="text-faint">· {habit.category}</span> : null}
                {habit.target ? <span className="text-faint">· {habit.target}</span> : null}
              </p>
            </div>

            <Menu
              trigger={({ toggle, props }) => (
                <button
                  type="button"
                  onClick={toggle}
                  {...props}
                  className="btn-icon-sm"
                  aria-label={`Actions for ${habit.name}`}
                >
                  <Ellipsis className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            >
              {({ close }) => (
                <>
                  <MenuItem icon={CalendarCheck} onClick={() => { onDetail(habit); close(); }}>
                    View history &amp; streaks
                  </MenuItem>
                  <MenuItem icon={Pencil} onClick={() => { onEdit(habit); close(); }}>
                    Edit habit
                  </MenuItem>
                  <MenuItem
                    icon={habit.archived ? ArchiveRestore : Archive}
                    onClick={() => { onArchive(habit); close(); }}
                  >
                    {habit.archived ? 'Restore habit' : 'Archive habit'}
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem danger icon={Trash} onClick={() => { onDelete(habit); close(); }}>
                    Delete habit
                  </MenuItem>
                </>
              )}
            </Menu>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat icon={Flame} tone="text-warning" value={stats.current} label="streak" />
        <MiniStat icon={Sparkles} tone="text-accent" value={stats.longest} label="best" />
        <MiniStat icon={CalendarCheck} tone="text-info" value={`${stats.week.rate}%`} label="7-day" />
      </div>

      <div className="mt-3">
        <ProgressBar
          value={stats.week.scheduled ? stats.week.rate : null}
          tone={stats.week.rate >= 80 ? 'success' : 'accent'}
          showValue={false}
          label={false}
        />
      </div>

      <div className="mt-3">
        {!scheduled ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-2 text-center text-xs text-muted">
            Rest day — not scheduled for this date
          </p>
        ) : future ? (
          <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-center text-xs text-muted">
            Scheduled for {date} (future dates can’t be completed yet)
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(habit, date)}
            aria-pressed={completed}
            disabled={!editable}
            className={cn(
              'btn w-full cursor-pointer',
              completed ? 'btn-secondary text-success' : 'btn-primary',
            )}
          >
            <CircleCheck className="h-4 w-4" aria-hidden="true" />
            {completed ? 'Completed — undo' : date === today ? 'Mark complete' : `Mark done for ${date}`}
          </button>
        )}
      </div>
    </article>
  );
}

function MiniStat({ icon: Icon, value, label, tone }) {
  return (
    <div className="rounded-lg bg-surface-2 py-1.5">
      <p className="flex items-center justify-center gap-1 text-sm font-semibold text-text tabular-nums">
        <Icon className={cn('h-3.5 w-3.5', tone)} aria-hidden="true" />
        {value}
      </p>
      <p className="text-[0.65rem] text-faint">{label}</p>
    </div>
  );
}
