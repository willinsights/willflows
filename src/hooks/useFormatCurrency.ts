import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMemo } from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

const PRIVACY_MASK = '••••••';

/**
 * Single-source hook for currency formatting.
 *
 * Privacy-aware: when workspace privacy mode is active, `formatCurrency`
 * returns a mask string (e.g. "••••••") so every existing consumer
 * automatically respects privacy mode — no need to sprinkle
 * `MoneyValue`/`PrivacyBlur` in every place a value is rendered.
 *
 * For exports (PDF, CSV, XLSX) that must contain real values regardless of
 * privacy mode, use `formatCurrencyRaw` instead.
 *
 * Usage:
 *   const { formatCurrency, formatCurrencyRaw } = useFormatCurrency();
 *   formatCurrency(1234.56)     // → "1.234,56 €" (or "••••••" when private)
 *   formatCurrencyRaw(1234.56)  // → "1.234,56 €" always
 */
export function useFormatCurrency() {
  const { currentWorkspace } = useWorkspace();
  const { isPrivacyMode } = usePrivacyMode();

  const locale = currentWorkspace?.locale || 'pt-PT';
  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrencyRaw = useMemo(() => {
    return (
      amount: number,
      opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
    ): string => {
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
  }, [locale, currency]);

  const formatCurrency = useMemo(() => {
    if (!isPrivacyMode) return formatCurrencyRaw;
    return (
      _amount: number,
      _opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
    ): string => PRIVACY_MASK;
  }, [isPrivacyMode, formatCurrencyRaw]);

  return { formatCurrency, formatCurrencyRaw, currency, isPrivacyMode };
}
