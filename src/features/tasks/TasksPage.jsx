import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  Columns3,
  List as ListIcon,
  ListChecks,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Segmented from '../../components/common/Segmented.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import TaskFormModal from './TaskFormModal.jsx';
import TaskRow from './TaskRow.jsx';
import KanbanBoard from './KanbanBoard.jsx';
import { DEADLINE_OPTIONS, DEFAULT_FILTERS, activeFilterCount, categoryList, filterTasks } from './taskFilters.js';
import { PRIORITIES, STATUSES } from '../../data/defaults.js';
import { overdueTasks } from '../../state/selectors.js';
import { readJSON, writeJSON } from '../../utils/storage.js';import { useNewModalFlag } from '../../hooks/useNewModalFlag.js';

const UI_KEY = 'lifeos.ui';

export default function TasksPage() {
  const { state, dispatch, toast } = useApp();
  const [view, setView] = useState(() => (readJSON(UI_KEY, {})?.taskView === 'kanban' ? 'kanban' : 'list'));
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modal, setModal] = useState(null); // { task?, defaultStatus? }
  const [confirmTask, setConfirmTask] = useState(null);
  const [newFlag, clearNewFlag] = useNewModalFlag();

  useEffect(() => {
    if (newFlag) {
      setModal({});
      clearNewFlag();
    }
  }, [newFlag, clearNewFlag]);

  const changeView = (next) => {
    setView(next);
    const ui = readJSON(UI_KEY, {});
    writeJSON(UI_KEY, { ...ui, taskView: next });
  };

  const visible = useMemo(() => filterTasks(state.tasks, filters), [state.tasks, filters]);
  const categories = useMemo(() => categoryList(state.tasks), [state.tasks]);
  const overdue = useMemo(() => overdueTasks(state), [state.tasks]);
  const completedCount = state.tasks.filter((t) => t.status === 'Completed').length;
  const filtersActive = activeFilterCount(filters) > 0;

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  /* ------------------------------- actions ------------------------------ */
  const toggleTask = (task) => {
    const completed = task.status === 'Completed';
    dispatch({ type: 'TASK_SET_STATUS', id: task.id, status: completed ? 'To Do' : 'Completed' });
    toast(completed ? 'Task reopened.' : 'Task completed. Nice work!', 'success');
  };

  const moveTask = (task, status) => {
    if (!task?.id || task.status === status) return;
    dispatch({ type: 'TASK_SET_STATUS', id: task.id, status });
    toast(`Moved to ${status}.`, 'success');
  };

  const requestDelete = (task) => setConfirmTask(task);

  const confirmDelete = () => {
    if (!confirmTask) return;
    dispatch({ type: 'TASK_DELETE', id: confirmTask.id });
    setConfirmTask(null);
    toast('Task deleted. Press Ctrl+Z to undo.', 'info');
  };

  const editTask = (task) => setModal({ task });

  /* -------------------------------- render ------------------------------ */
  const summary = (
    <p className="text-sm text-muted">
      <span className="font-semibold text-text">{state.tasks.length}</span> task{state.tasks.length === 1 ? '' : 's'}
      <span className="mx-1.5 text-faint">·</span>
      <span className="inline-flex items-center gap-1">
        <CircleCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        {completedCount} done
      </span>
      <span className="mx-1.5 text-faint">·</span>
      <span className="inline-flex items-center gap-1">
        <CircleAlert className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
        {overdue.length} overdue
      </span>
    </p>
  );

  return (
    <>
      <PageHeader
        title="Tasks"
        description={summary}
        actions={
          <>
            <Segmented
              ariaLabel="Task view"
              value={view}
              onChange={changeView}
              options={[
                { value: 'list', label: 'List', icon: ListIcon },
                { value: 'kanban', label: 'Kanban', icon: Columns3 },
              ]}
            />
            <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
              <CirclePlus className="h-4 w-4" aria-hidden="true" />
              New task
            </button>
          </>
        }
      />

      {/* ------------------------------ filters ----------------------------- */}
      <div className="mb-4 rounded-2xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              type="search"
              className="input pl-9"
              placeholder="Search tasks…"
              value={filters.q}
              onChange={setFilter('q')}
              aria-label="Search tasks by title, description or category"
            />
          </div>

          <select className="select w-auto min-w-[7.5rem] max-w-[11rem]" value={filters.status} onChange={setFilter('status')} aria-label="Filter by status">
            <option value="All">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select className="select w-auto min-w-[7.5rem] max-w-[11rem]" value={filters.priority} onChange={setFilter('priority')} aria-label="Filter by priority">
            <option value="All">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select className="select w-auto min-w-[7.5rem] max-w-[11rem]" value={filters.category} onChange={setFilter('category')} aria-label="Filter by category">
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select className="select w-auto min-w-[7.5rem] max-w-[11rem]" value={filters.deadline} onChange={setFilter('deadline')} aria-label="Filter by deadline">
            {DEADLINE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1">
              <select className="select w-auto min-w-[7rem]" value={filters.sort} onChange={setFilter('sort')} aria-label="Sort tasks by">
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
                <option value="created">Created</option>
                <option value="title">Title</option>
              </select>
              <button
                type="button"
                className="btn-icon border border-line"
                onClick={() => setFilters((f) => ({ ...f, dir: f.dir === 'asc' ? 'desc' : 'asc' }))}
                aria-label={filters.dir === 'asc' ? 'Sort ascending (switch to descending)' : 'Sort descending (switch to ascending)'}
                title={filters.dir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {filters.dir === 'asc' ? <ArrowUp className="h-4 w-4" aria-hidden="true" /> : <ArrowDown className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>

            {filtersActive ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-2.5 px-1 text-xs text-muted" role="status">
          Showing {visible.length} of {state.tasks.length} tasks
          {filtersActive ? ` · ${activeFilterCount(filters)} filter${activeFilterCount(filters) === 1 ? '' : 's'} applied` : ''}
        </p>
      </div>

      {/* ------------------------------- content ---------------------------- */}
      {state.tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Capture your first task and LifeOS will track it across the dashboard, calendar and analytics."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
              <CirclePlus className="h-4 w-4" aria-hidden="true" />
              Create your first task
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No tasks match your filters"
          description="Try different keywords or clear the active filters to see all tasks again."
          action={
            <button type="button" className="btn btn-secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset filters
            </button>
          }
        />
      ) : view === 'kanban' ? (
        <KanbanBoard
          tasks={visible}
          onEdit={editTask}
          onDelete={requestDelete}
          onToggle={toggleTask}
          onMove={moveTask}
          onAddInStatus={(status) => setModal({ defaultStatus: status })}
        />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={editTask}
              onDelete={requestDelete}
              onToggle={toggleTask}
              onMove={moveTask}
            />
          ))}
        </ul>
      )}

      {overdue.length > 0 && filters.deadline === 'All' && view === 'list' && visible.length > 0 ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <CircleAlert className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
          {overdue.length} task{overdue.length === 1 ? '' : 's'} past the due date — completed tasks are never marked overdue.
        </p>
      ) : null}

      <TaskFormModal
        open={modal !== null}
        onClose={() => setModal(null)}
        task={modal?.task}
        defaultStatus={modal?.defaultStatus}
      />

      <ConfirmDialog
        open={confirmTask !== null}
        danger
        title="Delete task?"
        message={`“${confirmTask?.title ?? ''}” will be removed permanently. You can undo this right afterwards with Ctrl+Z.`}
        confirmLabel="Delete task"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTask(null)}
      />
    </>
  );
}
