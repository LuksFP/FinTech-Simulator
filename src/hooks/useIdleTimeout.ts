import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
];

/**
 * Logs the user out automatically after `timeoutMs` ms of inactivity.
 * Resets the timer on any user interaction.
 *
 * @param onIdle  Callback to execute when idle timeout fires (typically signOut + navigate)
 * @param timeoutMs  Inactivity window in ms. Default: 30 minutes.
 * @param enabled  Set false to disable (e.g. when user is not authenticated).
 */
export function useIdleTimeout(
  onIdle: () => void,
  timeoutMs = 30 * 60 * 1000,
  enabled = true,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    reset();

    IDLE_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, reset]);
}
