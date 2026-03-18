import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { HealthScoreResult } from '@/hooks/useProjectHealthScore';

interface ProjectHealthScoreBadgeProps {
  result: HealthScoreResult;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const levelStyles: Record<string, string> = {
  excellent: 'bg-success/15 text-success border-success/25',
  good: 'bg-primary/15 text-primary border-primary/25',
  warning: 'bg-warning/15 text-warning border-warning/25',
  critical: 'bg-destructive/15 text-destructive border-destructive/25',
};

const levelDotStyles: Record<string, string> = {
  excellent: 'bg-success',
  good: 'bg-primary',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

export function ProjectHealthScoreBadge({ result, size = 'sm', showLabel = false }: ProjectHealthScoreBadgeProps) {
  const tooltipContent = useMemo(() => (
    <div className="space-y-1.5 max-w-[220px]">
      <div className="flex items-center justify-between">
        <span className="font-medium text-xs">Health Score</span>
        <span className="font-bold text-sm">{result.score}/100</span>
      </div>
      {result.factors.length > 0 ? (
        <div className="space-y-1 border-t border-border/50 pt-1.5">
          {result.factors.map(f => (
            <div key={f.key} className="flex items-start justify-between gap-2 text-[10px]">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="text-destructive font-medium whitespace-nowrap">{f.impact}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Sem problemas detetados</p>
      )}
    </div>
  ), [result]);

  const isSm = size === 'sm';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'inline-flex items-center gap-1 rounded-full border font-medium cursor-default transition-colors',
            levelStyles[result.level],
            isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
          )}
        >
          <span className={cn('rounded-full shrink-0', levelDotStyles[result.level], isSm ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
          <span>{result.score}</span>
          {showLabel && <span className="hidden sm:inline">{result.label}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
