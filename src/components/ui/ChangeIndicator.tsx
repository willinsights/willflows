import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangeIndicatorProps {
  change: number | null;
  invertColor?: boolean; // For costs, where increase is negative
}

export function ChangeIndicator({ change, invertColor = false }: ChangeIndicatorProps) {
  if (change === null) return null;
  
  const isPositive = change >= 0;
  const showAsPositive = invertColor ? !isPositive : isPositive;
  
  return (
    <span className={cn(
      "text-[10px] flex items-center gap-0.5 mt-0.5",
      showAsPositive ? "text-success" : "text-destructive"
    )}>
      {isPositive ? (
        <TrendingUp className="h-2.5 w-2.5" />
      ) : (
        <TrendingDown className="h-2.5 w-2.5" />
      )}
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}
