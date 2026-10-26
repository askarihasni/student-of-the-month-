import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Eye, ListChecks, Play, Plus, Repeat, RotateCcw, Settings2, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import WidgetShell from './WidgetShell.jsx';
import SummaryCards from './SummaryCards.jsx';
import AgendaWidget from './AgendaWidget.jsx';
import WeeklyChartWidget from './WeeklyChartWidget.jsx';
import {
  DailyProgressWidget,
  UpcomingTasksWidget,
  HabitsWidget,
  GoalsWidget,
  FocusWidget,
} from './ListsWidget.jsx';
import { dashboardStats } from '../../state/selectors.js';
import { WIDGET_IDS, WIDGET_LABELS } from '../../data/defaults.js';
import { cn } from '../../utils/cn.js';

/** Widget components, keyed by their persisted id. */
const WIDGETS = {
  summary: { title: 'At a glance', Component: SummaryCards, wide: true, renderable: false },
  dailyProgress: { title: 'Daily completion', Component: DailyProgressWidget },
  agenda: { title: "Today's agenda", Component: AgendaWidget },
  weeklyChart: { title: 'Last 7 days', Component: WeeklyChartWidget, wide: true },
  upcoming: { title: 'Upcoming tasks', Component: UpcomingTasksWidget },
  habits: { title: 'Habits today', Component: HabitsWidget },
  goals: { title: 'Goal progress', Component: GoalsWidget },
  focus: { title: 'Focus time', Component: FocusWidget },
};

const QUICK_ACTIONS = [
  { label: 'Task', icon: ListChecks, to: '/tasks?new=1' },
  { label: 'Habit', icon: Repeat, to: '/habits?new=1' },
  { label: 'Event', icon: CalendarPlus, to: '/calendar?new=1' },
  { label: 'Goal', icon: Target, to: '/goals?new=1' },
  { label: 'Focus', icon: Play, to: '/focus' },
];

function greetingFor(hours) {
  if (hours < 5) return 'Still up';
  if (hours < 12) return 'Good morning';
  if (hours < 17) return 'Good afternoon';
  if (hours < 21) return 'Good evening';
  return 'Good night';
}

export default function DashboardPage() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const today = new Date();
  const stats = useMemo(() => dashboardStats(state), [state]);
  const layout = state.dashboard;
  const hiddenSet = useMemo(() => new Set(layout.hidden), [layout.hidden]);
  const visible = layout.order.filter((id) => !hiddenSet.has(id) && WIDGETS[id]);
  const hiddenIds = WIDGET_IDS.filter((id) => hiddenSet.has(id));

  const setLayout = (order, hidden) => dispatch({ type: 'DASH_SET_LAYOUT', order, hidden });

  /** Swap a widget with its adjacent *visible* neighbour (hidden ones stay put). */
  const move = (id, delta) => {
    const index = visible.indexOf(id);
    const target = visible[index + delta];
    if (index < 0 || !target) return;
    const order = [...layout.order];
    const a = order.indexOf(id);
    const b = order.indexOf(target);
    [order[a], order[b]] = [order[b], order[a]];
    setLayout(order, layout.hidden);
  };

  const hide = (id) => {
    setLayout(layout.order, [...layout.hidden, id]);
    toast(`“${WIDGET_LABELS[id] ?? id}” hidden. Restore it from Customize.`, 'info');
  };

  const restore = (id) => setLayout(layout.order, layout.hidden.filter((x) => x !== id));

  const resetLayout = () => {
    dispatch({ type: 'DASH_RESET' });
    setConfirmReset(false);
    toast('Dashboard layout reset to the default.', 'success');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greetingFor(today.getHours())}, here's your day`}
        description={today.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
        actions={
          <>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex" aria-label="Quick actions">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(action.to)}
                >
                  <action.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {action.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={cn('btn btn-sm', editing ? 'btn-primary' : 'btn-secondary')}
              onClick={() => setEditing((v) => !v)}
              aria-pressed={editing}
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              {editing ? 'Done' : 'Customize'}
            </button>
          </>
        }
      />

      {editing ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-accent/35 bg-accent-soft/60 p-3.5 sm:p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Customize your dashboard</p>
            <p className="text-xs text-muted">
              Reorder widgets with the arrows, hide what you don't need, and bring hidden ones back below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hiddenIds.length > 0 ? (
              <span className="chip">{hiddenIds.length} hidden</span>
            ) : null}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset layout
            </button>
          </div>

          {hiddenIds.length > 0 ? (
            <ul className="flex w-full flex-wrap gap-2 border-t border-line pt-3" aria-label="Hidden widgets">
              {hiddenIds.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className="btn btn-sm border border-line bg-surface-2 text-muted hover:text-text"
                    onClick={() => restore(id)}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    {WIDGET_LABELS[id] ?? id}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {visible.map((id) => {
          const widget = WIDGETS[id];
          const { Component } = widget;
          return (
            <WidgetShell
              key={id}
              id={id}
              title={widget.title}
              subtitle={WIDGET_LABELS[id]}
              editing={editing}
              onMoveUp={() => move(id, -1)}
              onMoveDown={() => move(id, 1)}
              onHide={() => hide(id)}
              canMoveUp={visible.indexOf(id) > 0}
              canMoveDown={visible.indexOf(id) < visible.length - 1}
              className={cn(widget.wide && 'xl:col-span-2')}
            >
              {widget.renderable === false ? <Component stats={stats} /> : <Component />}
            </WidgetShell>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-text">All widgets are hidden</p>
          <p className="mt-1 text-sm text-muted">
            Use Customize → restore a widget, or reset the layout to the default arrangement.
          </p>
          <button type="button" className="btn btn-primary btn-sm mx-auto mt-4" onClick={resetLayout}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Reset to default layout
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        title="Reset dashboard layout?"
        message="This restores the default widget order and brings every hidden widget back. Your tasks, habits, and other records are not affected."
        confirmLabel="Reset layout"
        onConfirm={resetLayout}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
