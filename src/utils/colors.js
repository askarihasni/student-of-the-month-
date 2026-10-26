export const CATEGORY_COLORS = {
  Work: '#7c6cf6',
  Meeting: '#f472b6',
  Personal: '#38bdf8',
  Health: '#34d399',
  Study: '#fbbf24',
  Career: '#a78bfa',
  Finance: '#fb923c',
  Growth: '#22d3ee',
  Reflection: '#c084fc',
  Wellbeing: '#4ade80',
  Other: '#94a3b8',
};

const PALETTE = ['#7c6cf6', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee', '#fb923c'];

/** Stable colour for known categories, hashed palette entry for custom ones. */
export function categoryColor(category) {
  const key = (category || '').trim();
  if (!key) return PALETTE[PALETTE.length - 1];
  if (CATEGORY_COLORS[key]) return CATEGORY_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function categoryDot(category, className = '') {
  return { backgroundColor: categoryColor(category), className };
}
