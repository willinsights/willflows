import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useHideValues } from '@/hooks/useHideValues';

export type MoneyTone = 'income' | 'expense' | 'profit' | 'neutral';

/**
 * Unified currency cell.
 * - tabular-nums for column alignment
 * - respects workspace privacy mode via useFormatCurrency
 * - respects hideValues UI toggle via blur
 */
export function Money({
  value,
  tone = 'neutral',
  sign = false,
  hideable = true,
  className,
}: {
  value: number;
  tone?: MoneyTone;
  /** Prepend `+` on positive values. */
  sign?: boolean;
  /** Apply blur when workspace hideValues is on. */
  hideable?: boolean;
  className?: string;
}) {
  const { formatCurrency } = useFormatCurrency();
  const { hideValues } = useHideValues();

  const toneClass =
    tone === 'income'
      ? 'text-success'
      : tone === 'expense'
      ? 'text-destructive'
      : tone === 'profit'
      ? value >= 0
        ? 'text-primary'
        : 'text-destructive'
      : '';

  const prefix = sign && value > 0 ? '+' : '';

  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        toneClass,
        hideable && hideValues && 'blur-md select-none',
        className,
      )}
    >
      {prefix}
      {formatCurrency(value)}
    </span>
  );
}
