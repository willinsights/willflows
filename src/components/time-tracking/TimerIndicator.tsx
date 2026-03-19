import { Timer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration } from '@/hooks/useTimeTracking';
import { cn } from '@/lib/utils';

interface TimerIndicatorProps {
  elapsedSeconds: number;
  className?: string;
}

export function TimerIndicator({ elapsedSeconds, className }: TimerIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-0.5 text-[9px] text-primary font-mono',
            className
          )}>
            <Timer className="h-2.5 w-2.5 animate-pulse text-primary" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] px-2 py-1">
          Timer ativo
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
