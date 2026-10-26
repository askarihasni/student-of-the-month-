import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import AppShell from './components/layout/AppShell.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import TasksPage from './features/tasks/TasksPage.jsx';
import HabitsPage from './features/habits/HabitsPage.jsx';
import CalendarPage from './features/calendar/CalendarPage.jsx';
import FocusPage from './features/focus/FocusPage.jsx';
import GoalsPage from './features/goals/GoalsPage.jsx';
import AnalyticsPage from './features/analytics/AnalyticsPage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';

/**
 * HashRouter keeps deep links working on any static host (GitHub Pages,
 * Vercel, plain `vite preview`) without server rewrite rules.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
