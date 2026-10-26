# LifeOS — Personal Productivity OS

A polished, fully client-side productivity app: tasks, habits, calendar, focus timer, goals, analytics and settings — all driven by one validated state store persisted to `localStorage`. No backend, no accounts, no network calls.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). That's it — the first launch seeds realistic sample data automatically.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (hot reload) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the whole project |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

The app is 100% static after `npm run build`; `dist/` can be hosted on any static file server (it uses `HashRouter`, so deep links like `/#/analytics` work without server rewrites).

## Tech stack

- **React 19** + **Vite 8** (ES modules, `@vitejs/plugin-react`)
- **Tailwind CSS v4** (`@tailwindcss/vite`, class-based dark mode via a `dark` class on `<html>`)
- **Recharts 3** for analytics/dashboard charts, **lucide-react** for icons
- **react-router-dom 7** (`HashRouter`)
- **Vitest 5 + jsdom + Testing Library** for tests, **ESLint 9** for linting
- Inter variable font (`@fontsource-variable/inter`)

## Architecture

```
src/
├── components/
│   ├── charts/       ChartCard, ChartTooltip, shared Recharts theme
│   ├── common/       Modal, ConfirmDialog, Badge, EmptyState, Fields, Menu,
│   │                 PageHeader, ProgressBar, Segmented, Spinner, Toasts,
│   │                 ErrorBoundary
│   └── layout/       AppShell, Sidebar, Topbar, MobileNav, CommandPalette, nav.js
├── context/
│   └── AppContext.jsx   The single store: provider, persistence, timer watcher,
│                        toast API, global keyboard shortcuts
├── data/
│   ├── defaults.js      Schema version, storage keys, option lists, pref limits
│   ├── sampleData.js    Realistic first-launch/reset seed data
│   └── tones.js         Badge tone maps (priority/status/goal status)
├── features/          One folder per module (page + its child components)
│   ├── dashboard/     DashboardPage + widgets (Summary, Agenda, Lists, WeeklyChart)
│   ├── tasks/         TasksPage (list + kanban), TaskRow, TaskFormModal, filters
│   ├── habits/        HabitsPage, HabitCard, HabitDetailModal, HabitHeatmap
│   ├── calendar/      CalendarPage (day/week), EventFormModal (overlap warnings)
│   ├── focus/         FocusPage (timer UI + session history)
│   ├── goals/         GoalsPage, GoalFormModal
│   ├── analytics/     AnalyticsPage (range picker + KPIs + charts)
│   └── settings/      SettingsPage (theme, focus prefs, backup/restore, reset)
├── state/
│   ├── reducer.js     All action types, per-section reducers, undo/redo,
│   │                  STATE_IMPORT / STATE_RESET, serializeState()
│   ├── factories.js   Record constructors (createTask, createHabit, …)
│   └── selectors.js   Every derived stat (dashboard, calendar, analytics)
├── utils/             dates, streaks, goals, timer, backup, storage, id,
│                      sound, colors, cn
└── test/setup.js      jsdom stubs (ResizeObserver, matchMedia, scrollIntoView)
```

### State management

- One `useReducer` store in `AppContext.jsx`; every module dispatches plain action objects (`TASK_ADD`, `HABIT_TOGGLE_LOG`, `EVENT_UPDATE`, `GOAL_ADD_MILESTONE`, `TIMER_START`, `PREFS_UPDATE`, …).
- **Persistence**: after every dispatch the state is serialized (undo history stripped) and written to `localStorage` under `lifeos.state.v1` with a `schemaVersion` stamp. On boot the stored state is validated/shaped by `utils/backup.js` (`sanitizeState`); corrupt or missing data falls back to a clean initial state (sample data only on first launch or explicit reset).
- **Undo/redo**: undoable actions push a snapshot of the affected sections onto `past` (capped at 50); `UNDO`/`REDO` swap snapshots and are bound to `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`. Non-undoable actions (timer ticks, log toggles, settings) preserve the history arrays instead of clobbering them.
- **All stats are derived** in `selectors.js` from the source records — nothing numeric is stored as a fake counter. Delete a task and every affected chart, streak and KPI updates immediately.

### Routing

`/#/dashboard`, `/#/tasks`, `/#/habits`, `/#/calendar`, `/#/focus`, `/#/goals`, `/#/analytics`, `/#/settings`. Unknown hashes redirect to the dashboard. `?new=1` on calendar/goals opens the create modal for that module's quick action.

## Calculation conventions

These rules are implemented once in `utils/` and unit-tested; the UI never reimplements them.

### Habit streaks (`utils/streaks.js`)

- A habit is *scheduled* on a date when its schedule includes that weekday (`daily` = every day, otherwise selected weekdays).
- **Rest days** (unscheduled days) neither extend nor break a streak; a "3-day streak" on a Mon/Wed/Fri habit means 3 scheduled completions.
- A scheduled day with no completion record breaks the streak — **except today**, which is reported as pending: the streak shows as of yesterday until you check in (or the day ends).
- Future scheduled dates are never treated as missed. Dates before the habit's creation date are ignored.
- Completion rate = completed scheduled days ÷ scheduled days in the range (only up to today).

### Goal progress (`utils/goals.js`)

- `progress = round(completedMilestones / totalMilestones × 100)` — always derived from milestones, never a stored number.
- Zero milestones → progress is `null` and the UI shows a safe "add milestones to track progress" state (no division by zero).
- Status is derived: `completed` when every milestone is done, `overdue` when the target date has passed and progress < 100, otherwise `active`.

### Focus timer (`utils/timer.js`)

- The timer never counts down on an interval. State stores `durationMs`, the epoch `startedAt` of the current running stretch, and `elapsedMs` banked by finished stretches:
  `elapsed = elapsedMs + (running ? now − startedAt : 0)`, `remaining = max(0, durationMs − elapsed)`.
- Consequence: pausing, refreshing the page, or backgrounding the tab produces the correct remaining time (a watcher in the provider ticks every 400 ms purely to re-render).
- Completion is guarded: exactly one session record is created per timer run (`sessionId` match), even if the watcher fires multiple times.

### Calendar overlaps (`features/calendar/EventFormModal.jsx`)

- Two events conflict when `startA < endB && startB < endA` — **boundary-exclusive**, so a 10:00–11:00 meeting and an 11:00–12:00 meeting are *not* a conflict.
- Overlaps raise a non-blocking warning with a list of the conflicting events; the second click on "Save" confirms ("Save anyway").

### Task & analytics stats (`state/selectors.js`)

- Overdue = incomplete task with `dueDate` before today. Due today = every task dated today (completed included) so the dashboard number matches what you see in the list.
- Analytics ranges (7/30/90 days, this month, custom) are resolved to inclusive local dates; charts aggregate real `sessions`, `habitLogs`, and task statuses in that window. Empty ranges render explicit empty states instead of blank charts.

All dates are stored as **local** `YYYY-MM-DD` strings (date-only values never touch UTC); timestamps (timer, sessions) are epoch milliseconds.

## Demo checklist

Use this to walk the app end-to-end:

- [ ] **First launch** — dashboard greets you by time of day, sample tasks/habits/events/goals seeded once; reload keeps your data (no re-seeding).
- [ ] **Tasks** — create with title/notes/due/priority/status; switch list ⇄ kanban; drag a card between columns; search + filter by status/priority; complete and un-complete; edit; delete with confirm; overdue badges.
- [ ] **Undo/redo** — `Ctrl+Z` / `Ctrl+Shift+Z` (also in the topbar) revert/redo your last change anywhere in the app.
- [ ] **Habits** — create with weekday schedule; check in today; heatmap shows real history; streak counts scheduled days only; a rest day does not break the streak; miss a *scheduled* day and the streak resets; future dates never show as missed.
- [ ] **Calendar** — day and week views, navigate weeks/days, create events with start/end times; create an overlapping event → warning lists the conflict; save anyway on the second click; today's deadlines appear as chips.
- [ ] **Focus** — pick a session type from your settings durations; start/pause/resume/reset; **refresh the page mid-session** → remaining time is still correct; let it finish → exactly one session is recorded; link a task; history + daily focus goal update.
- [ ] **Goals** — create a goal with milestones; progress bar = done/total; toggle milestones inline; a goal with zero milestones shows the safe state; overdue/completed statuses derive from data.
- [ ] **Analytics** — switch 7d/30d/90d/month/custom; every chart and KPI is computed from your real records; an empty range shows an empty state, not zeros dressed as data.
- [ ] **Dashboard widgets** — enter edit mode, reorder and hide widgets, restore defaults; layout persists.
- [ ] **Command palette** — `Ctrl/Cmd+K` opens it; navigate/filter and jump to any module or action.
- [ ] **Settings** — switch light/dark/system theme (applies instantly, survives reload); edit focus durations (validated ranges); toggle completion sound.
- [ ] **Backup** — Export downloads a JSON snapshot; import it back (strictly validated, atomic — an invalid file changes nothing); **Reset to Sample Data** asks for confirmation.
- [ ] **Responsive** — check 390 px (mobile nav + stacked layouts), 768 px, 1366 px, 1920 px.
- [ ] **Accessibility** — keyboard through forms/modals, visible focus rings, Esc closes overlays, no console errors or React key warnings in DevTools.

## Testing & QA

`npm run test` — **107 tests across 8 files, all passing**:

| File | Covers |
| --- | --- |
| `src/utils/dates.test.js` | Local `YYYY-MM-DD` math, formatting, ranges |
| `src/utils/streaks.test.js` | Streak rules (rest days, pending today, missed scheduled day, future dates, completion rate) |
| `src/utils/goals.test.js` | Progress derivation, zero-milestone safety, status |
| `src/utils/timer.test.js` | Elapsed/remaining math across pause/resume/clock drift, exactly-once completion |
| `src/utils/backup.test.js` | Strict backup validation (atomic import), corrupt/partial payloads, round-trip |
| `src/state/reducer.test.js` | All sections' reducers, undo/redo incl. the non-undoable-action history regression, import/reset |
| `src/state/selectors.test.js` | Dashboard/calendar/analytics derivations from source records |
| `src/App.test.jsx` | Integration: first launch + seeding, persistence, sidebar navigation of every module, create-task → undo flow, theme switching |

Also run and verified clean: `npm run lint` (no findings) and `npm run build` (succeeds; the only warning is Vite's generic ">500 kB chunk" note caused by Recharts). Dev-server smoke check: app serves and renders.

## Backup format

Exports are plain JSON: `{ app: 'lifeos', schemaVersion: 1, exportedAt, data: { tasks, habits, habitLogs, events, sessions, goals, prefs, dashboard } }`. Import is **atomic and strict** — the file is fully validated before a single record is written; on any error the current state is untouched and a message explains what failed. Undo history (`past`/`future`) is never exported or imported.

## Limitations

- **Single user, single device** — `localStorage` is per-browser/per-device; there is no sync. Use Export/Import to move data.
- **Data is not durable against "Clear site data"** — clearing browser storage deletes progress (export regularly).
- Timer completion is detected while the app is open (the watcher runs every 400 ms). If the tab is fully closed, reopening shows the session as done and records it once — but a completion sound obviously won't play retroactively.
- Streaks and "today" boundaries use the device's local clock and time zone; changing time zones can shift which day a logged date belongs to.
- The production JS chunk (~254 kB gzip) includes Recharts; route-level code splitting was not implemented.
- Analytics "this month" and custom ranges are capped at 4,000-day iteration guards; realistic ranges are far below that.
