import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { STORAGE_KEY } from './data/defaults.js';

/**
 * Integration smoke tests: render the real app (provider + router + pages) and
 * drive it through user-visible flows. These catch wiring/runtime errors that
 * pure unit tests cannot — for example a reducer that drops undo history.
 */

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

async function renderApp() {
  const utils = render(<App />);
  // First launch seeds sample data; wait for the dashboard heading.
  await screen.findByRole('heading', { level: 1 });
  return utils;
}

describe('App — first launch', () => {
  it('shows the dashboard with the greeting heading and summary widgets', async () => {
    await renderApp();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // Summary cards link to their modules.
    expect(
      screen.getAllByRole('link', { name: /open (tasks|habits|goals|focus)/i }).length,
    ).toBeGreaterThan(0);
  });

  it('persists state to localStorage after seeding', async () => {
    await renderApp();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed.tasks)).toBe(true);
    expect(parsed.tasks.length).toBeGreaterThan(0);
    // Undo bookkeeping is stripped from what is written to disk.
    expect(parsed.past).toBeUndefined();
  });
});

describe('App — navigation', () => {
  it('navigates to every primary module from the sidebar', async () => {
    const user = userEvent.setup();
    await renderApp();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });

    for (const [label, heading] of [
      ['Tasks', 'Tasks'],
      ['Habits', 'Habits'],
      ['Calendar', 'Calendar'],
      ['Focus', 'Focus'],
      ['Goals', 'Goals'],
      ['Analytics', 'Analytics'],
      ['Settings', 'Settings'],
      ['Dashboard', /day|Dashboard/i],
    ]) {
      await user.click(within(nav).getByRole('link', { name: new RegExp(label, 'i') }));
      const h1 = await screen.findByRole('heading', { level: 1 });
      expect(h1.textContent).toMatch(heading);
    }
  });
});

describe('App — tasks + undo (regression)', () => {
  it('creates a task, then undoes it with Ctrl+Z without crashing', async () => {
    const user = userEvent.setup();
    await renderApp();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    await user.click(within(nav).getByRole('link', { name: /^Tasks/i }));

    await user.click(await screen.findByRole('button', { name: /new task/i }));

    const title = 'Integration test task';
    await user.type(await screen.findByRole('textbox', { name: /title/i }), title);
    await user.click(screen.getByRole('button', { name: /create task/i }));

    // The new task is visible on the page.
    expect(await screen.findByText(title)).toBeInTheDocument();

    // Undo removes it — this exercises the past/future bookkeeping path.
    await user.keyboard('{Control>}z{/Control}');
    await screen.findByText(/showing/i);
    expect(screen.queryByText(title)).not.toBeInTheDocument();
  });
});

describe('App — settings', () => {
  it('switches the theme and applies the dark class to the document', async () => {
    const user = userEvent.setup();
    await renderApp();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    await user.click(within(nav).getByRole('link', { name: /^Settings/i }));

    const light = await screen.findByRole('radio', { name: /light/i });
    await user.click(light);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    const dark = screen.getByRole('radio', { name: /dark/i });
    await user.click(dark);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
