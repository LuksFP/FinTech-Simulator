/**
 * Application-wide constants
 * Centralized configuration for theming and chart colors
 */

export const CHART_COLORS = {
  primary: 'hsl(186 72% 50%)',
  income: 'hsl(160 84% 39%)',
  expense: 'hsl(0 72% 51%)',
  grid: 'hsl(222 30% 18%)',
  text: 'hsl(215 20% 65%)',
} as const;

export const TOOLTIP_STYLES = {
  backgroundColor: 'hsl(222 47% 10%)',
  border: '1px solid hsl(222 30% 18%)',
  borderRadius: '8px',
  color: 'hsl(210 40% 98%)',
} as const;

export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.4,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** Fraction of spending_limit that triggers an email alert */
export const SPENDING_ALERT_THRESHOLD = 0.8;

/** Debounce delay (ms) for realtime subscription refetches */
export const REALTIME_DEBOUNCE_MS = 500;
