import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { cn } from '@/lib/utils';

interface MoneyValueProps {
  value: number | string | null | undefined;
  /** Override workspace currency (ISO 4217). Defaults to workspace currency. */
  currency?: string;
  /** Override workspace locale. Defaults to workspace locale. */
  locale?: string;
  className?: string;
  as?: 'span' | 'div' | 'p';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Pre-formatted string (skips Intl formatting). */
  formatted?: string;
  /** Mask used when privacy mode is active. */
  mask?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const sizeClasses: Record<NonNullable<MoneyValueProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * MoneyValue — global monetary value renderer that honours the workspace
 * privacy mode (blurs and masks the displayed value).
 *
 * Always use this component instead of rendering `formatCurrency(value)`
 * directly to guarantee privacy mode coverage across the app.
 */
export const MoneyValue: React.FC<MoneyValueProps> = ({
  value,
  currency,
  locale,
  className,
  as: Tag = 'span',
  size = 'md',
  formatted,
  mask = '••••••',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}) => {
  const { isPrivacyMode } = usePrivacyMode();
  const { currentWorkspace } = useWorkspace();

  const resolvedLocale = locale || currentWorkspace?.locale || 'pt-PT';
  const resolvedCurrency = currency || currentWorkspace?.currency || 'EUR';

  let display: string;
  if (formatted !== undefined) {
    display = formatted;
  } else if (value === null || value === undefined || value === '') {
    display = '—';
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      display = '—';
    } else {
      try {
        display = new Intl.NumberFormat(resolvedLocale, {
          style: 'currency',
          currency: resolvedCurrency,
          minimumFractionDigits,
          maximumFractionDigits,
        }).format(value);
      } catch {
        display = `${resolvedCurrency} ${value.toFixed(2)}`;
      }
    }
  } else {
    display = String(value);
  }

  return (
    <Tag
      className={cn(
        sizeClasses[size],
        'tabular-nums transition-all duration-200',
        isPrivacyMode && 'blur-sm select-none pointer-events-none',
        className,
      )}
      aria-hidden={isPrivacyMode || undefined}
      data-privacy={isPrivacyMode ? 'masked' : undefined}
    >
      {isPrivacyMode ? mask : display}
    </Tag>
  );
};

export default MoneyValue;
