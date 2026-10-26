import { useMemo } from 'react';
import { addDays, dayOfWeek, formatMediumDate, isDateStr, todayStr, weekdayLongName } from '../../utils/dates.js';
import { completionSet, isScheduledOn } from '../../utils/streaks.js';
import { cn } from '../../utils/cn.js';

const WEEKS = 13;

/**
 * Contribution-style history grid (last 13 weeks).
 * Cells are real buttons for scheduled dates up to today, so history can be
 * inspected *and corrected*; every cell also carries a text label for screen
 * readers (state is never conveyed by colour alone).
 */
export default function HabitHeatmap({ habit, habitLogs, onToggleDate }) {
  const today = todayStr();

  const { weeks, monthLabels } = useMemo(() => {
    if (!habit || !isDateStr(habit.createdAt)) return { weeks: [], monthLabels: [] };
    // End of the current week (Saturday), covering 13 full weeks.
    const end = addDays(today, 6 - dayOfWeek(today));
    const start = addDays(end, -(WEEKS * 7 - 1));
    const done = completionSet(habitLogs, habit.id);

    const grid = [];
    for (let w = 0; w < WEEKS; w += 1) {
      const column = [];
      for (let d = 0; d < 7; d += 1) {
        const date = addDays(start, w * 7 + d);
        const scheduled = isScheduledOn(habit, date);
        const completed = done.has(date);
        const future = date > today;
        let state = 'rest';
        if (future) state = 'future';
        else if (scheduled && completed) state = 'done';
        else if (scheduled) state = 'missed';
        column.push({ date, state, scheduled, completed });
      }
      grid.push(column);
    }

    const labels = grid.map((column) => {
      const first = column[0];
      if (!first) return '';
      const [y, m, d] = first.date.split('-').map(Number);
      const dayInMonth = d;
      if (dayInMonth <= 7) {
        return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
      }
      return '';
    });

    return { weeks: grid, monthLabels: labels };
  }, [habit, habitLogs, today]);

  if (!habit) return null;

  const stateClass = {
    done: 'bg-accent border-accent hover:bg-accent-hover',
    missed: 'bg-surface-3 border-line hover:border-line-strong',
    rest: 'bg-surface-2 border-line/70 opacity-60',
    future: 'bg-transparent border-dashed border-line opacity-40',
  };

  const stateLabel = { done: 'completed', missed: 'missed', rest: 'rest day', future: 'not yet' };

  return (
    <div>
      <div className="mb-1.5 grid gap-1" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
        {monthLabels.map((label, i) => (
          <span key={`m-${i}-${label}`} className="text-[0.6rem] font-medium text-faint">
            {label}
          </span>
        ))}
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gridAutoFlow: 'column' }}
        role="grid"
        aria-label={`Completion history for ${habit.name}`}
      >
        {weeks.flat().map((cell) => {
          const editable = cell.scheduled && !cell.future && typeof onToggleDate === 'function';
          const className = cn(
            'h-3.5 w-full rounded-[3px] border transition-colors',
            stateClass[cell.state],
            editable && 'cursor-pointer',
          );
          const label = `${formatMediumDate(cell.date)}: ${stateLabel[cell.state]}${cell.scheduled ? '' : ` (${weekdayLongName(dayOfWeek(cell.date))} not scheduled)`}`;
          if (editable) {
            return (
              <button
                key={cell.date}
                type="button"
                className={className}
                onClick={() => onToggleDate(cell.date)}
                title={`${label} — click to ${cell.completed ? 'unmark' : 'mark'} completion`}
                aria-label={`${label}. Press to ${cell.completed ? 'remove' : 'add'} completion record.`}
              />
            );
          }
          return <span key={cell.date} className={className} title={label} aria-label={label} role="gridcell" />;
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.7rem] text-muted">
        <Legend swatch="bg-accent border-accent" label="Completed" />
        <Legend swatch="bg-surface-3 border-line" label="Missed" />
        <Legend swatch="bg-surface-2 border-line/70 opacity-60" label="Rest day" />
        <Legend swatch="bg-transparent border-dashed border-line" label="Future" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-block h-3 w-3 rounded-[3px] border', swatch)} aria-hidden="true" />
      {label}
    </span>
  );
}
