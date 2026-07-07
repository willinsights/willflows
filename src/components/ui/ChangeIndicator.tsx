import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangeIndicatorProps {
  change: number | null;
  invertColor?: boolean; // For costs, where increase is negative
  /** 'inline' (default): tiny text under a value. 'badge': pill next to a KPI. */
  variant?: 'inline' | 'badge';
}

export function ChangeIndicator({ change, invertColor = false, variant = 'inline' }: ChangeIndicatorProps) {
  if (change === null) return null;

  const isPositive = change >= 0;
  const showAsPositive = invertColor ? !isPositive : isPositive;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const label = `${isPositive ? '+' : ''}${change}%`;

  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
          showAsPositive
            ? 'bg-success/10 text-success'
            : 'bg-destructive/10 text-destructive',
        )}
      >
        <Icon className="h-2.5 w-2.5" />
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-[10px] flex items-center gap-0.5 mt-0.5 tabular-nums',
        showAsPositive ? 'text-success' : 'text-destructive',
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
