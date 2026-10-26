/**
 * Stable unique ID generation with a safe fallback for environments
 * where `crypto.randomUUID` is unavailable.
 */
export function createId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore and fall through */
  }
  // RFC4122-ish v4 fallback using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Simple check that a value looks like an ID we produced. */
export function isId(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 64;
}
