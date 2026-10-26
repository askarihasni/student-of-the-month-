import {
  Activity,
  BookOpen,
  Circle,
  Coffee,
  Droplets,
  Flame,
  Footprints,
  Leaf,
  Moon,
  Mountain,
  PenLine,
  Sparkles,
  Sun,
  Target,
  Timer,
  Zap,
} from 'lucide-react';

/** Allowed habit icons (name → component) so stored records stay serialisable. */
export const HABIT_ICONS = {
  circle: Circle,
  footprints: Footprints,
  book: BookOpen,
  leaf: Leaf,
  droplets: Droplets,
  mountain: Mountain,
  pen: PenLine,
  flame: Flame,
  zap: Zap,
  coffee: Coffee,
  target: Target,
  moon: Moon,
  sun: Sun,
  activity: Activity,
  timer: Timer,
  sparkles: Sparkles,
};

export const HABIT_ICON_OPTIONS = Object.keys(HABIT_ICONS);

export function habitIcon(name) {
  return HABIT_ICONS[name] || Circle;
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
