import {
  subDays, startOfMonth, endOfMonth, subMonths,
  startOfDay, endOfDay,
} from 'date-fns';
import type { PeriodType } from '@/types/transaction';

interface CustomRange { from?: Date; to?: Date }

/**
 * Pure function — converts a PeriodType + optional custom range into
 * absolute start/end Date objects. Extracted for testability.
 */
export function calculateDateRange(
  period: PeriodType,
  customDateRange?: CustomRange,
  now = new Date(),
): { start: Date | null; end: Date | null } {
  switch (period) {
    case '7days':
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case '30days':
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'lastMonth': {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case 'custom':
      return {
        start: customDateRange?.from ? startOfDay(customDateRange.from) : null,
        end:   customDateRange?.to   ? endOfDay(customDateRange.to)     : null,
      };
    default:
      return { start: null, end: null };
  }
}
