import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartColumn, CircleAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Segmented from '../../components/common/Segmented.jsx';
import ChartCard from '../../components/charts/ChartCard.jsx';
import ChartTooltip from '../../components/charts/ChartTooltip.jsx';
import { SERIES, useChartColors } from '../../components/charts/chartTheme.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import {
  goalSummaryCounts,
  productivitySeries,
  rangeStats,
  resolveRange,
  taskCountsByPriority,
  taskCountsByStatus,
} from '../../state/selectors.js';
import { habitAggregate } from '../../state/selectors.js';
import { formatDuration, formatLongDate, isDateStr } from '../../utils/dates.js';

const RANGE_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_COLORS = { 'To Do': '#94a3b8', 'In Progress': '#60a5fa', Completed: '#34d399' };

export default function AnalyticsPage() {
  const { state } = useApp();
  const colors = useChartColors();
  const [rangeKey, setRangeKey] = useState('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const customValid = isDateStr(custom.from) && isDateStr(custom.to);
  const { from, to } = useMemo(
    () => resolveRange(rangeKey === 'custom' && !customValid ? '7d' : rangeKey, custom),
    [rangeKey, custom, customValid],
  );

  const stats = useMemo(() => rangeStats(state, from, to), [state, from, to]);
  const series = useMemo(() => productivitySeries(state, from, to), [state, from, to]);
  const statusData = useMemo(() => taskCountsByStatus(state), [state]);
  const priorityData = useMemo(() => taskCountsByPriority(state), [state]);
  const habit = useMemo(() => habitAggregate(state, from, to), [state, from, to]);
  const goals = useMemo(() => goalSummaryCounts(state), [state]);

  const hasAnyData =
    stats.completedTasks > 0 ||
    stats.createdTasks > 0 ||
    stats.focusSessions > 0 ||
    habit.scheduled > 0 ||
    state.tasks.length > 0 ||
    state.habits.length > 0;

  const isCustom = rangeKey === 'custom';

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Every figure below is computed from your saved records for the selected range — nothing is hardcoded."
        actions={
          <Segmented ariaLabel="Date range" value={rangeKey} onChange={setRangeKey} options={RANGE_OPTIONS} />
        }
      />

      {isCustom ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3">
          <label className="text-sm">
            <span className="label">From</span>
            <input
              type="date"
              className="input w-auto"
              value={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="label">To</span>
            <input
              type="date"
              className="input w-auto"
              value={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            />
          </label>
          <p className="pb-2 text-xs text-muted" role="status">
            {customValid
              ? `Showing ${formatLongDate(from)} → ${formatLongDate(to)}`
              : 'Pick both dates (a reversed range is swapped automatically).'}
          </p>
        </div>
      ) : null}

      {/* ----------------------------- KPI strip --------------------------- */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Tasks completed" value={String(stats.completedTasks)} sub={`${stats.createdTasks} created in range`} />
        <Kpi label="Focus time" value={formatDuration(stats.focusMinutes)} sub={`${stats.focusSessions} session${stats.focusSessions === 1 ? '' : 's'}`} />
        <Kpi
          label="Habit check-ins"
          value={habit.scheduled ? `${habit.rate}%` : '—'}
          sub={habit.scheduled ? `${habit.completed}/${habit.scheduled} scheduled check-ins` : 'No habits scheduled in range'}
        />
        <Kpi label="Goals completed" value={String(goals.completed)} sub={`${goals.active} still active`} />
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={ChartColumn}
          title="Not enough data to chart yet"
          description="Complete tasks, check in habits or run a focus session inside this range and the charts will populate automatically."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* -------------------------- productivity trend ------------------ */}
          <ChartCard
            className="xl:col-span-2"
            title="Productivity trend"
            subtitle={`${formatLongDate(from)} → ${formatLongDate(to)} — tasks completed, focus minutes and habit completion rate`}
          >
            {series.every((d) => d.tasksCompleted === 0 && d.focusMinutes === 0 && d.habitRate === 0) ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                No activity in this range. Widen the range or record some activity.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: colors.label, fontSize: 11 }}
                    axisLine={{ stroke: colors.axis }}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    yAxisId="tasks"
                    allowDecimals={false}
                    tick={{ fill: colors.label, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                  />
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: colors.label, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                    label={{ value: '%', position: 'insideTopRight', fill: colors.label, fontSize: 10 }}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value, entry) =>
                          entry.dataKey === 'focusMinutes'
                            ? formatDuration(value)
                            : entry.dataKey === 'habitRate'
                              ? `${value}%`
                              : String(value)
                        }
                        labelFormatter={(label) => {
                          const row = series.find((d) => d.label === label);
                          return row ? formatLongDate(row.date) : label;
                        }}
                      />
                    }
                    cursor={{ fill: colors.surface3, opacity: 0.55 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: colors.label, paddingTop: 6 }}
                    formatter={(value) => <span style={{ color: colors.label }}>{value}</span>}
                  />
                  <Bar yAxisId="tasks" dataKey="tasksCompleted" name="Tasks completed" fill={colors.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Line
                    yAxisId="tasks"
                    type="monotone"
                    dataKey="focusMinutes"
                    name="Focus minutes"
                    stroke={colors.success}
                    strokeWidth={2.25}
                    dot={series.length > 40 ? false : { r: 2.5 }}
                  />
                  <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="habitRate"
                    name="Habit completion %"
                    stroke={colors.warning}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* --------------------------- task status ------------------------ */}
          <ChartCard title="Tasks by status" subtitle="All tasks in your store, grouped by current status.">
            {statusData.every((d) => d.value === 0) ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                No tasks yet — create one and it will show up here.
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <ResponsiveContainer width="100%" height={220} className="max-w-[260px]">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={86}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || SERIES[0]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v} task${v === 1 ? '' : 's'}`} />} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="min-w-[10rem] space-y-2 text-sm">
                  {statusData.map((entry) => (
                    <li key={entry.name} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: STATUS_COLORS[entry.name] || SERIES[0] }}
                        aria-hidden="true"
                      />
                      <span className="text-muted">{entry.name}</span>
                      <span className="ml-auto font-semibold text-text tabular-nums">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ChartCard>

          {/* --------------------------- task priority ---------------------- */}
          <ChartCard title="Open tasks by priority" subtitle="Workload balance across your backlog.">
            {priorityData.every((d) => d.value === 0) ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                No open tasks — your backlog is clear.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: colors.label, fontSize: 11 }} axisLine={{ stroke: colors.axis }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: colors.label, fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip
                    content={<ChartTooltip formatter={(v) => `${v} task${v === 1 ? '' : 's'}`} />}
                    cursor={{ fill: colors.surface3, opacity: 0.55 }}
                  />
                  <Bar dataKey="value" name="Open tasks" fill={colors.accent} radius={[5, 5, 0, 0]} maxBarSize={48}>
                    {priorityData.map((entry, i) => (
                      <Cell key={entry.name} fill={[SERIES[3], SERIES[2], SERIES[1], SERIES[0]][i] || SERIES[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ------------------------- habit completion --------------------- */}
          <ChartCard
            title="Habit completion"
            subtitle="Check-ins ÷ scheduled check-ins for this range (rest days excluded)."
          >
            <div className="flex flex-wrap items-center gap-6">
              <Donut
                value={habit.rate}
                label="completion rate"
                caption={habit.scheduled ? `${habit.completed} of ${habit.scheduled} scheduled` : 'Nothing scheduled'}
              />
              <ul className="min-w-[11rem] flex-1 space-y-2 text-sm">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted">Scheduled check-ins</span>
                  <span className="font-semibold text-text tabular-nums">{habit.scheduled}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted">Completed</span>
                  <span className="font-semibold text-success tabular-nums">{habit.completed}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted">Missed</span>
                  <span className="font-semibold text-text tabular-nums">{Math.max(0, habit.scheduled - habit.completed)}</span>
                </li>
              </ul>
            </div>
          </ChartCard>

          {/* --------------------------- focus minutes ---------------------- */}
          <ChartCard title="Focus minutes per day" subtitle="Only completed focus sessions count — breaks are never recorded.">
            {series.every((d) => d.focusMinutes === 0) ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                No focus sessions in this range. Start one on the Focus page.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: colors.label, fontSize: 11 }} axisLine={{ stroke: colors.axis }} tickLine={false} minTickGap={28} />
                  <YAxis allowDecimals={false} tick={{ fill: colors.label, fontSize: 11 }} axisLine={false} tickLine={false} width={44} label={{ value: 'min', position: 'insideTopLeft', fill: colors.label, fontSize: 10, offset: 6 }} />
                  <Tooltip
                    content={<ChartTooltip formatter={(v) => formatDuration(v)} labelFormatter={(label) => {
                      const row = series.find((d) => d.label === label);
                      return row ? formatLongDate(row.date) : label;
                    }} />}
                    cursor={{ fill: colors.surface3, opacity: 0.55 }}
                  />
                  <Bar dataKey="focusMinutes" name="Focus minutes" fill={colors.info} radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {!hasAnyData ? null : (
        <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Ranges are inclusive of both endpoints and computed in your local timezone. “Tasks completed” uses each
          task's completion date; habit rates only include dates the habit was actually scheduled for.
        </p>
      )}
    </>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="stat-value mt-0.5">{value}</p>
      <p className="mt-0.5 truncate text-xs text-faint">{sub}</p>
    </div>
  );
}

function Donut({ value, label, caption }) {
  const safe = Math.max(0, Math.min(100, value ?? 0));
  const r = 52;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative grid h-36 w-36 shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-surface-3" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe / 100)}
        />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-semibold text-text tabular-nums">{safe}%</p>
        <p className="text-[0.65rem] text-faint">{label}</p>
      </div>
      <span className="sr-only">
        {caption} — {safe} percent
      </span>
    </div>
  );
}
