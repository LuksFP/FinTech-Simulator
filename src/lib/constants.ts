// Cores via CSS vars pra acompanhar o tema claro/escuro automaticamente.
export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  income: 'hsl(var(--income))',
  expense: 'hsl(var(--expense))',
  grid: 'hsl(var(--border))',
  text: 'hsl(var(--muted-foreground))',
} as const;

export const TOOLTIP_STYLES = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--popover-foreground))',
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
