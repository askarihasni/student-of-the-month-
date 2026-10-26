import { useState } from 'react';
import { CirclePlus, Inbox, MoveRight } from 'lucide-react';
import TaskRow from './TaskRow.jsx';
import { STATUSES } from '../../data/defaults.js';
import { sortTasks } from '../../state/selectors.js';
import { cn } from '../../utils/cn.js';

const COLUMN_ACCENT = {
  'To Do': 'bg-muted',
  'In Progress': 'bg-info',
  Completed: 'bg-success',
};

/**
 * Kanban board bound to the same task records as the list view.
 * Drag a card between columns, or use the card's ⋯ menu (keyboard/touch
 * friendly) for the same change.
 */
export default function KanbanBoard({ tasks, onEdit, onDelete, onToggle, onMove, onAddInStatus }) {
  const [dragId, setDragId] = useState(null);
  const [overStatus, setOverStatus] = useState(null);

  const handleDrop = (status, e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setOverStatus(null);
    setDragId(null);
    if (id) onMove({ id }, status);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:px-0">
      <div className="grid min-w-[760px] grid-cols-3 gap-4">
        {STATUSES.map((status) => {
          const items = sortTasks(
            tasks.filter((t) => t.status === status),
            'due',
          );
          const isOver = overStatus === status;
          return (
            <section
              key={status}
              aria-label={`${status} column, ${items.length} tasks`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStatus(status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOverStatus((s) => (s === status ? null : s));
              }}
              onDrop={(e) => handleDrop(status, e)}
              className={cn(
                'flex min-h-[280px] flex-col rounded-2xl border bg-surface-2/70 transition-colors',
                isOver ? 'border-accent bg-accent-soft' : 'border-line',
              )}
            >
              <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <span className={cn('h-2 w-2 rounded-full', COLUMN_ACCENT[status])} aria-hidden="true" />
                <h3 className="text-sm font-semibold text-text">{status}</h3>
                <span className="ml-auto rounded-md bg-surface-3 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted">
                  {items.length}
                </span>
              </header>

              <ul className="flex flex-1 flex-col gap-2.5 p-2.5">
                {items.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    variant="board"
                    dragging={dragId === task.id}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    onMove={onMove}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDragId(task.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStatus(null);
                    }}
                  />
                ))}

                {items.length === 0 ? (
                  <li className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line px-3 py-6 text-center">
                    {status === 'Completed' ? (
                      <MoveRight className="h-4 w-4 text-faint" aria-hidden="true" />
                    ) : (
                      <Inbox className="h-4 w-4 text-faint" aria-hidden="true" />
                    )}
                    <p className="text-xs text-muted">
                      {isOver ? 'Drop a task here' : status === 'Completed' ? 'Finished work lands here' : 'No tasks'}
                    </p>
                  </li>
                ) : null}
              </ul>

              <button
                type="button"
                onClick={() => onAddInStatus(status)}
                className="m-2.5 mt-0 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <CirclePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Add task
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
