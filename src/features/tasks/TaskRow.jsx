import {
  CalendarDays,
  Circle,
  CircleAlert,
  CircleCheck,
  Clock,
  Ellipsis,
  Flag,
  Pencil,
  Repeat as MoveIcon,
  Trash,
} from 'lucide-react';
import Menu, { MenuItem, MenuSeparator } from '../../components/common/Menu.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { priorityTone, statusTone } from '../../data/tones.js';
import { cn } from '../../utils/cn.js';
import { isOverdue } from '../../state/selectors.js';
import { formatDuration, relativeDayLabel, todayStr } from '../../utils/dates.js';
import { STATUSES } from '../../data/defaults.js';

/**
 * One task row (list view) or card (Kanban view).
 * Status can be changed from the overflow menu — the accessible alternative to
 * drag-and-drop, usable with keyboard and touch.
 */
export default function TaskRow({ task, variant = 'list', onEdit, onDelete, onToggle, onMove, dragging = false, onDragStart, onDragEnd }) {
  const completed = task.status === 'Completed';
  const overdue = isOverdue(task);
  const today = todayStr();
  const dueToday = !completed && task.dueDate === today;

  const meta = (
    <div className="flex flex-wrap items-center gap-1.5">
      {task.status !== 'To Do' ? <Badge tone={statusTone[task.status]}>{task.status}</Badge> : null}
      <Badge tone={priorityTone[task.priority]} icon={Flag} title={`Priority: ${task.priority}`}>
        {task.priority}
      </Badge>
      {task.category ? <span className="chip">{task.category}</span> : null}
      {task.dueDate ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
            overdue
              ? 'border-danger/30 bg-danger-soft text-danger'
              : dueToday
                ? 'border-info/30 bg-info-soft text-info'
                : 'border-line bg-surface-2 text-muted',
          )}
        >
          {overdue ? <CircleAlert className="h-3 w-3" aria-hidden="true" /> : <CalendarDays className="h-3 w-3" aria-hidden="true" />}
          <time dateTime={task.dueDate}>
            {relativeDayLabel(task.dueDate)}
            {task.dueTime ? ` · ${task.dueTime}` : ''}
          </time>
          {overdue ? <span className="sr-only"> (overdue)</span> : null}
        </span>
      ) : null}
      {task.estimateMin ? (
        <span className="inline-flex items-center gap-1 text-xs text-faint">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {formatDuration(task.estimateMin)}
        </span>
      ) : null}
      {overdue ? <span className="text-xs font-semibold text-danger">Overdue</span> : null}
    </div>
  );

  const menu = (
    <Menu
      trigger={({ toggle, props }) => (
        <button
          type="button"
          onClick={toggle}
          {...props}
          className="btn-icon-sm"
          aria-label={`Actions for ${task.title}`}
          title="Task actions"
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <MenuItem
            icon={completed ? Circle : CircleCheck}
            onClick={() => {
              onToggle(task);
              close();
            }}
          >
            {completed ? 'Reopen task' : 'Mark complete'}
          </MenuItem>
          <MenuItem
            icon={Pencil}
            onClick={() => {
              onEdit(task);
              close();
            }}
          >
            Edit task
          </MenuItem>
          {STATUSES.filter((s) => s !== task.status).map((status) => (
            <MenuItem
              key={status}
              icon={MoveIcon}
              onClick={() => {
                onMove(task, status);
                close();
              }}
            >
              Move to {status}
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuItem
            danger
            icon={Trash}
            onClick={() => {
              onDelete(task);
              close();
            }}
          >
            Delete task
          </MenuItem>
        </>
      )}
    </Menu>
  );

  const toggleButton = (
    <button
      type="button"
      onClick={() => onToggle(task)}
      className={cn(
        'mt-0.5 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors',
        completed
          ? 'border-success bg-success text-white'
          : 'border-line-strong bg-transparent text-faint hover:border-accent hover:text-accent',
      )}
      aria-pressed={completed}
      aria-label={completed ? `Reopen task: ${task.title}` : `Mark task complete: ${task.title}`}
      title={completed ? 'Reopen' : 'Mark complete'}
    >
      {completed ? <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}
    </button>
  );

  if (variant === 'board') {
    return (
      <li
        className={cn(
          'card card-hover cursor-grab p-3 active:cursor-grabbing',
          dragging && 'opacity-40',
          overdue && 'border-danger/35',
        )}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-label={`${task.title}, ${task.status}`}
      >
        <div className="flex items-start gap-2">
          {toggleButton}
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-medium leading-snug break-words', completed && 'text-muted line-through')}>
              {task.title}
            </p>
            <div className="mt-2">{meta}</div>
          </div>
          {menu}
        </div>
      </li>
    );
  }

  return (
    <li
      className={cn(
        'card card-hover flex items-start gap-3 p-3.5 sm:p-4',
        dragging && 'opacity-40',
        overdue && 'border-danger/35',
      )}
    >
      {toggleButton}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className={cn('text-sm font-medium leading-snug break-words sm:text-[0.9rem]', completed && 'text-muted line-through')}>
            {task.title}
          </p>
        </div>
        {task.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{task.description}</p>
        ) : null}
        <div className="mt-2">{meta}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {menu}
      </div>
    </li>
  );
}
