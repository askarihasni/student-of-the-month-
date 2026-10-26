import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement ResizeObserver or matchMedia, both of which Recharts
 * relies on. Minimal stubs keep chart-bearing pages renderable under test.
 */
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}

if (typeof window !== 'undefined' && typeof window.HTMLElement?.prototype?.scrollIntoView !== 'function') {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
