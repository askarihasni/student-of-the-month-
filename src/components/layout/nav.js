import {
  LayoutDashboard,
  ListChecks,
  Repeat,
  CalendarDays,
  Timer,
  Target,
  ChartColumn,
  Settings,
} from 'lucide-react';

/** Single source of truth for primary navigation. */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Overview of today' },
  { to: '/tasks', label: 'Tasks', icon: ListChecks, hint: 'Plan and ship your work' },
  { to: '/habits', label: 'Habits', icon: Repeat, hint: 'Daily and weekly routines' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, hint: 'Events and deadlines' },
  { to: '/focus', label: 'Focus', icon: Timer, hint: 'Pomodoro timer and sessions' },
  { to: '/goals', label: 'Goals', icon: Target, hint: 'Goals and milestones' },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn, hint: 'Productivity insights' },
  { to: '/settings', label: 'Settings', icon: Settings, hint: 'Preferences and data' },
];
