import { isOverdue } from '../../state/selectors.js';
import { sortTasks } from '../../state/selectors.js';
import { todayStr } from '../../utils/dates.js';

export const DEFAULT_FILTERS = {
  q: '',
  status: 'All',
  priority: 'All',
  category: 'All',
  deadline: 'All', // All | Overdue | Today | Upcoming | None
  sort: 'due', // due | priority | created | title
  dir: 'asc',
};

export const DEADLINE_OPTIONS = [
  { value: 'All', label: 'Any deadline' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Today', label: 'Due today' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'None', label: 'No due date' },
];

export function activeFilterCount(filters) {
  let n = 0;
  if (filters.q.trim()) n += 1;
  if (filters.status !== DEFAULT_FILTERS.status) n += 1;
  if (filters.priority !== DEFAULT_FILTERS.priority) n += 1;
  if (filters.category !== DEFAULT_FILTERS.category) n += 1;
  if (filters.deadline !== DEFAULT_FILTERS.deadline) n += 1;
  return n;
}

export function categoryList(tasks) {
  const set = new Set();
  for (const t of tasks) {
    const c = (t.category || '').trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Apply search + filters + sort to a task list. Pure and reusable. */
export function filterTasks(tasks, filters, today = todayStr()) {
  const q = filters.q.trim().toLowerCase();
  let list = tasks;

  if (q) {
    list = list.filter((t) =>
      [t.title, t.description, t.category, t.priority, t.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }
  if (filters.status !== 'All') list = list.filter((t) => t.status === filters.status);
  if (filters.priority !== 'All') list = list.filter((t) => t.priority === filters.priority);
  if (filters.category !== 'All') {
    list = list.filter((t) => (t.category || '').toLowerCase() === filters.category.toLowerCase());
  }

  switch (filters.deadline) {
    case 'Overdue':
      list = list.filter((t) => isOverdue(t, today));
      break;
    case 'Today':
      list = list.filter((t) => t.dueDate === today);
      break;
    case 'Upcoming':
      list = list.filter((t) => t.dueDate && t.dueDate > today);
      break;
    case 'None':
      list = list.filter((t) => !t.dueDate);
      break;
    default:
      break;
  }

  return sortTasks(list, filters.sort, filters.dir);
}
