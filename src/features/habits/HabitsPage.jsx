import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  History,
  Repeat,
  CalendarCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import HabitCard from './HabitCard.jsx';
import HabitFormModal from './HabitFormModal.jsx';
import HabitDetailModal from './HabitDetailModal.jsx';
import { createId } from '../../utils/id.js';
import { addDays, formatLongDate, formatShortDate, todayStr } from '../../utils/dates.js';
import { habitSummary, habitStats } from '../../state/selectors.js';
import { isCompletedOn } from '../../utils/streaks.js';
import { cn } from '../../utils/cn.js';
import { useNewModalFlag } from '../../hooks/useNewModalFlag.js';

export default function HabitsPage() {
  const { state, dispatch, toast } = useApp();
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [modal, setModal] = useState(null); // { habit? }
  const [detailHabit, setDetailHabit] = useState(null);
  const [confirmHabit, setConfirmHabit] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newFlag, clearNewFlag] = useNewModalFlag();

  useEffect(() => {
    if (newFlag) {
      setModal({});
      clearNewFlag();
    }
  }, [newFlag, clearNewFlag]);

  const active = useMemo(() => state.habits.filter((h) => !h.archived), [state.habits]);
  const archived = useMemo(() => state.habits.filter((h) => h.archived), [state.habits]);
  const summary = useMemo(() => habitSummary(state, date), [state, date]);

  const toggleHabit = (habit, targetDate = date) => {
    if (targetDate > today) {
      toast('Future dates cannot be marked complete.', 'info');
      return;
    }
    const wasCompleted = isCompletedOn(state.habitLogs, habit.id, targetDate);
    dispatch({ type: 'HABIT_LOG_TOGGLE', habitId: habit.id, date: targetDate, logId: createId() });
    toast(
      wasCompleted ? `Completion removed for ${formatShortDate(targetDate)}.` : `${habit.name} completed for ${formatShortDate(targetDate)}!`,
      'success',
    );
  };

  const archiveHabit = (habit) => {
    dispatch({ type: 'HABIT_SET_ARCHIVED', id: habit.id, archived: !habit.archived });
    toast(habit.archived ? 'Habit restored.' : 'Habit archived. Its history is preserved.', 'info');
  };

  const deleteHabit = (habit) => setConfirmHabit(habit);

  const confirmDelete = () => {
    if (!confirmHabit) return;
    dispatch({ type: 'HABIT_DELETE', id: confirmHabit.id });
    setConfirmHabit(null);
    setDetailHabit(null);
    toast('Habit and its history deleted. Press Ctrl+Z to undo.', 'info');
  };

  const headerSummary = (
    <p className="text-sm text-muted">
      <span className="font-semibold text-text">{active.length}</span> active habit
      {active.length === 1 ? '' : 's'}
      <span className="mx-1.5 text-faint">·</span>
      {summary.total === 0
        ? 'nothing scheduled for the selected date'
        : `${summary.done} of ${summary.total} completed on ${formatShortDate(date)}`}
    </p>
  );

  return (
    <>
      <PageHeader
        title="Habits"
        description={headerSummary}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
            <CirclePlus className="h-4 w-4" aria-hidden="true" />
            New habit
          </button>
        }
      />

      {/* ---------------------- date navigator + progress --------------------- */}
      <section className="card mb-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn-icon border border-line"
              onClick={() => setDate((d) => addDays(d, -1))}
              aria-label="Previous day"
              title="Previous day"
            >
              <ChevronLeft className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
            <div className="min-w-[13rem] text-center">
              <p className="text-sm font-semibold text-text">
                <time dateTime={date}>{formatLongDate(date)}</time>
              </p>
              <p className="text-[0.7rem] text-faint">{date === today ? 'Today' : date < today ? 'Past date' : 'Future date'}</p>
            </div>
            <button
              type="button"
              className="btn-icon border border-line disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setDate((d) => addDays(d, 1))}
              disabled={date >= today}
              aria-label="Next day"
              title={date >= today ? 'Cannot navigate past today' : 'Next day'}
            >
              <ChevronRight className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm ml-1"
              onClick={() => setDate(today)}
              disabled={date === today}
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-3">
            <History className="h-4 w-4 text-accent" aria-hidden="true" />
            <div className="w-40 sm:w-56">
              <ProgressBar
                value={summary.percent}
                tone={summary.percent === 100 ? 'success' : 'accent'}
                label={summary.total ? `${summary.done}/${summary.total} done` : 'Nothing scheduled'}
              />
            </div>
          </div>
        </div>

        {summary.total === 0 && active.length > 0 ? (
          <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
            No habits are scheduled on this date — take the rest day. Rest days never break a streak.
          </p>
        ) : null}
      </section>

      {/* ------------------------------ habit grid ---------------------------- */}
      {active.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No habits yet"
          description="Build a routine: pick a schedule, then check in each day. Streaks, rates and the heatmap are calculated for you."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
              <CirclePlus className="h-4 w-4" aria-hidden="true" />
              Create your first habit
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              date={date}
              completed={isCompletedOn(state.habitLogs, habit.id, date)}
              stats={habitStats(state, habit)}
              onToggle={toggleHabit}
              onEdit={(h) => setModal({ habit: h })}
              onArchive={archiveHabit}
              onDelete={deleteHabit}
              onDetail={(h) => setDetailHabit(h)}
            />
          ))}
        </div>
      )}

      {/* ------------------------------ archived ------------------------------ */}
      {archived.length > 0 ? (
        <section className="mt-6">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted hover:text-text"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
          >
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Archived habits ({archived.length})
            <ChevronRight className={cn('h-4 w-4 transition-transform', showArchived && 'rotate-90')} aria-hidden="true" />
          </button>

          {showArchived ? (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {archived.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  date={date}
                  completed={isCompletedOn(state.habitLogs, habit.id, date)}
                  stats={habitStats(state, habit)}
                  onToggle={toggleHabit}
                  onEdit={(h) => setModal({ habit: h })}
                  onArchive={archiveHabit}
                  onDelete={deleteHabit}
                  onDetail={(h) => setDetailHabit(h)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <HabitFormModal open={modal !== null} onClose={() => setModal(null)} habit={modal?.habit} />

      <HabitDetailModal
        open={detailHabit !== null}
        onClose={() => setDetailHabit(null)}
        habit={detailHabit}
        onEdit={(h) => {
          setDetailHabit(null);
          setModal({ habit: h });
        }}
        onToggleDate={(d) => detailHabit && toggleHabit(detailHabit, d)}
      />

      <ConfirmDialog
        open={confirmHabit !== null}
        danger
        title="Delete habit?"
        message={`“${confirmHabit?.name ?? ''}” and its entire completion history will be deleted. Streaks and analytics update immediately. You can undo with Ctrl+Z.`}
        confirmLabel="Delete habit"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmHabit(null)}
      />
    </>
  );
}
