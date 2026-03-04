import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMemo } from 'react';

/**
 * Single-source hook for currency formatting.
 * Use this instead of defining formatCurrency locally in every component.
 * 
 * Usage:
 *   const { formatCurrency } = useFormatCurrency();
 *   formatCurrency(1234.56) // → "1.234,56 €"
 */
export function useFormatCurrency() {
  const { currentWorkspace } = useWorkspace();

  const formatCurrency = useMemo(() => {
    const locale = currentWorkspace?.locale || 'pt-PT';
    const currency = currentWorkspace?.currency || 'EUR';

    return (amount: number, opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string => {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: opts?.minimumFractionDigits ?? 2,
          maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
        }).format(amount);
      } catch {
        return `${currency} ${amount.toFixed(2)}`;
      }
    };
  }, [currentWorkspace?.locale, currentWorkspace?.currency]);

  return { formatCurrency, currency: currentWorkspace?.currency || 'EUR' };
}
