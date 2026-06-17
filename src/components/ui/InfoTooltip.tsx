import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Discrete inline info icon with an explanatory tooltip.
 * Hover on desktop, tap on mobile (Radix handles both).
 */
export function InfoTooltip({ content, side = 'top', className }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Mais informação"
          className={cn('inline-flex items-center justify-center cursor-help', className)}
          onClick={(e) => e.preventDefault()}
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-sm leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
