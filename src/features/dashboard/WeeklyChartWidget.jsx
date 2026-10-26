import {
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartTooltip from '../../components/charts/ChartTooltip.jsx';
import { useChartColors } from '../../components/charts/chartTheme.js';
import { useApp } from '../../context/AppContext.jsx';
import { weeklySeries } from '../../state/selectors.js';
import { formatDuration, formatShortDate, todayStr } from '../../utils/dates.js';

/** Seven-day productivity chart (tasks completed + focus minutes). */
export default function WeeklyChartWidget({ height = 250 }) {
  const { state } = useApp();
  const colors = useChartColors();
  const today = todayStr();
  const data = weeklySeries(state, today);

  const totals = data.reduce(
    (acc, d) => ({
      tasks: acc.tasks + d.tasksCompleted,
      focus: acc.focus + d.focusMinutes,
      habitDays: acc.habitDays + d.habitDone,
      habitSlots: acc.habitSlots + d.habitTotal,
    }),
    { tasks: 0, focus: 0, habitDays: 0, habitSlots: 0 },
  );

  const hasData = totals.tasks > 0 || totals.focus > 0 || totals.habitSlots > 0;

  if (!hasData) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        No activity recorded in the last 7 days. Complete a task, check in a habit or run a focus session and this
        chart will fill in automatically.
      </p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.label, fontSize: 11 }}
            axisLine={{ stroke: colors.axis }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            yAxisId="tasks"
            allowDecimals={false}
            tick={{ fill: colors.label, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={34}
            label={{ value: 'tasks', position: 'insideTopLeft', fill: colors.label, fontSize: 10, offset: 8 }}
          />
          <YAxis
            yAxisId="minutes"
            orientation="right"
            allowDecimals={false}
            tick={{ fill: colors.label, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={34}
            label={{ value: 'min', position: 'insideTopRight', fill: colors.label, fontSize: 10, offset: 4 }}
          />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(value, entry) =>
                  entry.dataKey === 'focusMinutes' ? formatDuration(value) : String(value)
                }
                labelFormatter={(label) => {
                  const row = data.find((d) => d.label === label);
                  return row ? formatShortDate(row.date) : label;
                }}
              />
            }
            cursor={{ fill: colors.surface3, opacity: 0.55 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: colors.label, paddingTop: 6 }}
            formatter={(value) => <span style={{ color: colors.label }}>{value}</span>}
          />
          <Bar
            yAxisId="tasks"
            dataKey="tasksCompleted"
            name="Tasks completed"
            fill={colors.accent}
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
          <Line
            yAxisId="minutes"
            type="monotone"
            dataKey="focusMinutes"
            name="Focus minutes"
            stroke={colors.success}
            strokeWidth={2.25}
            dot={{ r: 3, fill: colors.success, strokeWidth: 0 }}
            activeDot={{ r: 4.5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <Mini label="Tasks done" value={String(totals.tasks)} />
        <Mini
          label="Habit check-ins"
          value={totals.habitSlots ? `${totals.habitDays}/${totals.habitSlots}` : '—'}
        />
        <Mini label="Focus time" value={formatDuration(totals.focus)} />
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <p className="text-sm font-semibold text-text tabular-nums">{value}</p>
      <p className="text-[0.65rem] text-faint">{label}</p>
    </div>
  );
}
