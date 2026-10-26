import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import GoalFormModal from './GoalFormModal.jsx';
import { goalSummaries, goalSummaryCounts } from '../../state/selectors.js';
import { goalStatusTone } from '../../data/tones.js';
import { buildMilestone } from '../../state/factories.js';
import { relativeDayLabel, todayStr } from '../../utils/dates.js';
import { cn } from '../../utils/cn.js';
import { useNewModalFlag } from '../../hooks/useNewModalFlag.js';

const MAX_MILESTONE = 200;

export default function GoalsPage() {
  const { state, dispatch, toast } = useApp();
  const [modal, setModal] = useState(null); // { goal? }
  const [confirm, setConfirm] = useState(null); // { kind: 'goal'|'milestone', ... }
  const [newFlag, clearNewFlag] = useNewModalFlag();

  useEffect(() => {
    if (newFlag) {
      setModal({});
      clearNewFlag();
    }
  }, [newFlag, clearNewFlag]);

  const summaries = useMemo(() => goalSummaries(state), [state]);
  const counts = useMemo(() => goalSummaryCounts(state), [state]);

  /* ------------------------------- actions ------------------------------ */
  const deleteGoal = () => {
    if (!confirm || confirm.kind !== 'goal') return;
    dispatch({ type: 'GOAL_DELETE', id: confirm.id });
    setConfirm(null);
    toast('Goal deleted. Press Ctrl+Z to undo.', 'info');
  };

  const deleteMilestone = () => {
    if (!confirm || confirm.kind !== 'milestone') return;
    dispatch({ type: 'MILESTONE_DELETE', goalId: confirm.goalId, id: confirm.id });
    setConfirm(null);
    toast('Milestone removed. Press Ctrl+Z to undo.', 'info');
  };

  const addMilestone = (goal, title) => {
    const trimmed = title.trim();
    if (!trimmed) return false;
    if (trimmed.length > MAX_MILESTONE) {
      toast(`Milestone text must be under ${MAX_MILESTONE} characters.`, 'error');
      return false;
    }
    dispatch({ type: 'MILESTONE_ADD', goalId: goal.id, milestone: buildMilestone({ title: trimmed }) });
    toast('Milestone added.', 'success');
    return true;
  };

  const toggleMilestone = (goal, milestone) => {
    dispatch({ type: 'MILESTONE_TOGGLE', goalId: goal.id, id: milestone.id });
  };

  return (
    <>
      <PageHeader
        title="Goals"
        description={
          <>
            <span className="font-semibold text-text">{counts.total}</span> goal{counts.total === 1 ? '' : 's'} ·{' '}
            {counts.active} active · {counts.completed} completed{counts.overdue ? ` · ${counts.overdue} overdue` : ''}
            {' — '}progress always equals completed milestones ÷ total milestones.
          </>
        }
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New goal
          </button>
        }
      />

      {summaries.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Goals measure progress from milestones — create one, then break it down into checkable steps."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create your first goal
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {summaries.map(({ goal, progress, status, counts: c }) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              progress={progress}
              status={status}
              counts={c}
              onEdit={() => setModal({ goal })}
              onDeleteGoal={() => setConfirm({ kind: 'goal', id: goal.id, title: goal.title })}
              onToggle={(m) => toggleMilestone(goal, m)}
              onAdd={(title) => addMilestone(goal, title)}
              onDeleteMilestone={(m) =>
                setConfirm({ kind: 'milestone', goalId: goal.id, id: m.id, title: m.title })
              }
            />
          ))}
        </div>
      )}

      <GoalFormModal open={modal !== null} onClose={() => setModal(null)} goal={modal?.goal} />

      <ConfirmDialog
        open={confirm !== null}
        danger
        title={confirm?.kind === 'goal' ? 'Delete goal?' : 'Delete milestone?'}
        message={
          confirm?.kind === 'goal'
            ? `“${confirm?.title ?? ''}” and its milestones will be removed. You can undo this right afterwards with Ctrl+Z.`
            : `“${confirm?.title ?? ''}” will be removed and this goal's progress will be recalculated. You can undo this right afterwards with Ctrl+Z.`
        }
        confirmLabel={confirm?.kind === 'goal' ? 'Delete goal' : 'Delete milestone'}
        onConfirm={confirm?.kind === 'goal' ? deleteGoal : deleteMilestone}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Goal card                                                           */
/* ------------------------------------------------------------------ */
function GoalCard({ goal, progress, status, counts, onEdit, onDeleteGoal, onToggle, onAdd, onDeleteMilestone }) {
  const [newTitle, setNewTitle] = useState('');
  const today = todayStr();

  const submitMilestone = (e) => {
    e.preventDefault();
    if (onAdd(newTitle) === true) setNewTitle('');
  };

  const statusLabel = status === 'overdue' ? 'Overdue' : status === 'completed' ? 'Completed' : 'Active';

  return (
    <section className="card flex min-w-0 flex-col p-4 sm:p-5" aria-label={`Goal: ${goal.title}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-text">{goal.title}</h2>
            <Badge tone={goalStatusTone[status]}>{statusLabel}</Badge>
            {goal.category ? <Badge>{goal.category}</Badge> : null}
          </div>
          {goal.description ? <p className="mt-1 text-sm leading-relaxed text-muted">{goal.description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="btn-icon-sm text-faint hover:text-accent"
            onClick={onEdit}
            aria-label={`Edit goal ${goal.title}`}
            title="Edit goal"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn-icon-sm text-faint hover:text-danger"
            onClick={onDeleteGoal}
            aria-label={`Delete goal ${goal.title}`}
            title="Delete goal"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ProgressBar
        value={progress}
        tone={status === 'completed' ? 'success' : status === 'overdue' ? 'danger' : 'accent'}
        label={counts.total === 0 ? 'No milestones yet' : `${counts.done} of ${counts.total} milestones`}
      />
      <p className="mt-1.5 text-xs text-muted">
        {counts.total === 0
          ? 'Progress stays at 0% until this goal has at least one milestone.'
          : progress === 100
            ? 'Every milestone is complete.'
            : `${counts.remaining} milestone${counts.remaining === 1 ? '' : 's'} remaining.`}
        {goal.targetDate ? ` · target ${relativeDayLabel(goal.targetDate)} (${goal.targetDate})` : ''}
        {status === 'overdue' ? ` · past the ${today} target and not finished` : ''}
      </p>

      <ul className="mt-3.5 space-y-2">
        {goal.milestones.map((m) => (
          <li
            key={m.id}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border px-3 py-2',
              m.done ? 'border-success/25 bg-success-soft/50' : 'border-line bg-surface-2',
            )}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={m.done}
              aria-label={`${m.done ? 'Mark incomplete' : 'Mark complete'}: ${m.title}`}
              onClick={() => onToggle(m)}
              className={cn(
                'grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-md border transition-colors',
                m.done ? 'border-success bg-success text-white' : 'border-line-strong bg-surface hover:border-accent',
              )}
            >
              {m.done ? <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </button>
            <span className={cn('min-w-0 flex-1 text-sm', m.done ? 'text-muted line-through' : 'text-text')}>
              {m.title}
            </span>
            <button
              type="button"
              className="btn-icon-sm text-faint hover:text-danger"
              onClick={() => onDeleteMilestone(m)}
              aria-label={`Delete milestone ${m.title}`}
              title="Delete milestone"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {goal.milestones.length === 0 ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-2.5 text-xs text-muted">
          <Target className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
          No milestones — add the first step below. A goal with zero milestones reports no measurable progress.
        </p>
      ) : null}

      <form onSubmit={submitMilestone} className="mt-3 flex items-center gap-2">
        <input
          className="input min-w-0 flex-1"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a milestone…"
          maxLength={MAX_MILESTONE + 20}
          aria-label={`Add a milestone to ${goal.title}`}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={!newTitle.trim()}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add
        </button>
      </form>
    </section>
  );
}
