import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import MobileNav from './MobileNav.jsx';
import CommandPalette from './CommandPalette.jsx';
import Toasts from '../common/Toasts.jsx';
import { readJSON, writeJSON } from '../../utils/storage.js';

const UI_KEY = 'lifeos.ui';

/** Application chrome: sidebar + top bar + routed content + mobile navigation. */
export default function AppShell() {
  const [collapsed, setCollapsed] = useState(() => readJSON(UI_KEY, {})?.sidebarCollapsed === true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      const ui = readJSON(UI_KEY, {});
      writeJSON(UI_KEY, { ...ui, sidebarCollapsed: next });
      return next;
    });
  };

  return (
    <div className="flex min-h-screen w-full max-w-full">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} variant="aside" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenDrawer={() => setDrawerOpen(true)} />
        <main id="main-content" className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <MobileNav onOpenMore={() => setDrawerOpen(true)} />
      {drawerOpen ? <Sidebar variant="drawer" onClose={() => setDrawerOpen(false)} /> : null}
      <CommandPalette />
      <Toasts />
    </div>
  );
}
