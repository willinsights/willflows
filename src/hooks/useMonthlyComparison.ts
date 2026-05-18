import { useMemo } from 'react';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { calculateChange } from '@/lib/finance/financialEngine';

export interface MonthlyComparisonResult {
  currentValue: number;
  previousValue: number;
  change: number | null; // null means no previous data to compare
  currentCount: number;
  previousCount: number;
  countChange: number | null;
}

export interface MonthlyComparisonOptions<T> {
  /** Array of items to analyze */
  data: T[];
  /** Function to extract the date from each item */
  getDate: (item: T) => Date | string;
  /** Function to extract the numeric value from each item */
  getValue: (item: T) => number;
  /** Optional: Reference date (defaults to now) */
  referenceDate?: Date;
}

/**
 * Hook to calculate month-over-month comparison metrics
 * 
 * @example
 * const { currentValue, change } = useMonthlyComparison({
 *   data: projects,
 *   getDate: (p) => p.created_at,
 *   getValue: (p) => p.agreed_value || 0,
 * });
 */
export function useMonthlyComparison<T>({
  data,
  getDate,
  getValue,
  referenceDate = new Date(),
}: MonthlyComparisonOptions<T>): MonthlyComparisonResult {
  return useMemo(() => {
    const currentMonthStart = startOfMonth(referenceDate);
    const previousMonthStart = startOfMonth(subMonths(referenceDate, 1));
    const previousMonthEnd = endOfMonth(subMonths(referenceDate, 1));

    // Filter items for current month
    const currentMonthItems = data.filter((item) => {
      const itemDate = new Date(getDate(item));
      return itemDate >= currentMonthStart;
    });

    // Filter items for previous month
    const previousMonthItems = data.filter((item) => {
      const itemDate = new Date(getDate(item));
      return itemDate >= previousMonthStart && itemDate <= previousMonthEnd;
    });

    // Calculate totals
    const currentValue = currentMonthItems.reduce((sum, item) => sum + getValue(item), 0);
    const previousValue = previousMonthItems.reduce((sum, item) => sum + getValue(item), 0);

    // Calculate changes
    const change = calculateChange(currentValue, previousValue);
    const countChange = calculateChange(currentMonthItems.length, previousMonthItems.length);

    return {
      currentValue,
      previousValue,
      change,
      currentCount: currentMonthItems.length,
      previousCount: previousMonthItems.length,
      countChange,
    };
  }, [data, getDate, getValue, referenceDate]);
}

/**
 * Hook to compare multiple metrics at once
 */
export interface MultiMetricComparisonOptions<T> {
  data: T[];
  getDate: (item: T) => Date | string;
  metrics: Record<string, (item: T) => number>;
  referenceDate?: Date;
}

export interface MultiMetricResult {
  [key: string]: MonthlyComparisonResult;
}

export function useMultiMetricComparison<T>({
  data,
  getDate,
  metrics,
  referenceDate = new Date(),
}: MultiMetricComparisonOptions<T>): MultiMetricResult {
  return useMemo(() => {
    const currentMonthStart = startOfMonth(referenceDate);
    const previousMonthStart = startOfMonth(subMonths(referenceDate, 1));
    const previousMonthEnd = endOfMonth(subMonths(referenceDate, 1));

    // Filter items for each period once
    const currentMonthItems = data.filter((item) => {
      const itemDate = new Date(getDate(item));
      return itemDate >= currentMonthStart;
    });

    const previousMonthItems = data.filter((item) => {
      const itemDate = new Date(getDate(item));
      return itemDate >= previousMonthStart && itemDate <= previousMonthEnd;
    });

    // Calculate all metrics
    const result: MultiMetricResult = {};

    for (const [key, getValue] of Object.entries(metrics)) {
      const currentValue = currentMonthItems.reduce((sum, item) => sum + getValue(item), 0);
      const previousValue = previousMonthItems.reduce((sum, item) => sum + getValue(item), 0);

      result[key] = {
        currentValue,
        previousValue,
        change: calculateChange(currentValue, previousValue),
        currentCount: currentMonthItems.length,
        previousCount: previousMonthItems.length,
        countChange: calculateChange(currentMonthItems.length, previousMonthItems.length),
      };
    }

    return result;
  }, [data, getDate, metrics, referenceDate]);
}

/**
 * Utility to count items created in current month
 */
export function useNewThisMonth<T>(
  data: T[],
  getDate: (item: T) => Date | string,
  referenceDate: Date = new Date()
): number {
  return useMemo(() => {
    const currentMonthStart = startOfMonth(referenceDate);
    return data.filter((item) => new Date(getDate(item)) >= currentMonthStart).length;
  }, [data, getDate, referenceDate]);
}
