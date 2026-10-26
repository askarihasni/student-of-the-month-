import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';

/**
 * Chart palette resolved per theme.
 *
 * Colours are plain values (never `var()` inside SVG attributes, which is
 * unreliable) and are recomputed whenever the persisted theme changes, so
 * every chart stays readable in dark and light mode.
 */
const DARK = {
  grid: 'rgba(148, 163, 184, 0.12)',
  label: '#99a2b8',
  axis: 'rgba(148, 163, 184, 0.25)',
  tooltipBg: '#161a24',
  tooltipBorder: 'rgba(148, 163, 184, 0.25)',
  tooltipText: '#e8ebf4',
  mutedText: '#99a2b8',
  surface: '#11141c',
  surface3: '#1d2230',
  accent: '#7c6cf6',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#60a5fa',
  track: '#1d2230',
};

const LIGHT = {
  grid: 'rgba(15, 23, 42, 0.09)',
  label: '#55607a',
  axis: 'rgba(15, 23, 42, 0.2)',
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(15, 23, 42, 0.14)',
  tooltipText: '#131722',
  mutedText: '#55607a',
  surface: '#ffffff',
  surface3: '#eef1f8',
  accent: '#6246ea',
  success: '#0e9f6e',
  warning: '#c27803',
  danger: '#d13c3c',
  info: '#2563eb',
  track: '#eef1f8',
};

/** Series colours chosen to stay legible on both themes. */
export const SERIES = ['#7c6cf6', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'];

export function useChartColors() {
  const { state } = useApp();
  const theme = state.prefs.theme === 'light' ? 'light' : 'dark';
  return useMemo(() => (theme === 'light' ? { ...LIGHT, series: SERIES } : { ...DARK, series: SERIES }), [theme]);
}
