/**
 * Safe localStorage access. Every call degrades gracefully when storage is
 * unavailable (private mode, disabled cookies, quota exceeded).
 */
const memory = new Map();
let warned = false;

function warnOnce(err) {
  if (warned) return;
  warned = true;
  console.warn('[LifeOS] localStorage is unavailable, continuing in memory mode.', err);
}

function storage() {
  try {
    const probe = '__lifeos_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (err) {
    warnOnce(err);
    return null;
  }
}

export function readJSON(key, fallback = null) {
  const store = storage();
  try {
    const raw = store ? store.getItem(key) : memory.get(key) ?? null;
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    warnOnce(err);
    return fallback;
  }
}

export function writeJSON(key, value) {
  const store = storage();
  try {
    const raw = JSON.stringify(value);
    if (store) store.setItem(key, raw);
    else memory.set(key, raw);
    return true;
  } catch (err) {
    warnOnce(err);
    if (!store) memory.set(key, JSON.stringify(value));
    return false;
  }
}

export function removeKey(key) {
  const store = storage();
  try {
    if (store) store.removeItem(key);
    memory.delete(key);
  } catch (err) {
    warnOnce(err);
  }
}

export function hasKey(key) {
  const store = storage();
  try {
    if (store) return store.getItem(key) != null;
    return memory.has(key);
  } catch {
    return memory.has(key);
  }
}
