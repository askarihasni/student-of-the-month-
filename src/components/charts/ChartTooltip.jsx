import { useChartColors } from './chartTheme.js';

/** Shared recharts tooltip styled with theme tokens. */
export default function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  const colors = useChartColors();
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        background: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        color: colors.tooltipText,
      }}
    >
      {label != null ? (
        <p className="mb-1 font-semibold" style={{ color: colors.tooltipText }}>
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={entry.dataKey || i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color || entry.fill || colors.accent }}
              aria-hidden="true"
            />
            <span style={{ color: colors.mutedText }}>{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums" style={{ color: colors.tooltipText }}>
              {formatter ? formatter(entry.value, entry) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
