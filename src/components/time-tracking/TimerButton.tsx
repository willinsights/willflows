import { Play, Pause, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/hooks/useTimeTracking';

interface TimerButtonProps {
  isActive: boolean;
  elapsedSeconds: number;
  onStart: () => void;
  onPause: () => void;
  isStarting?: boolean;
  isPausing?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function TimerButton({
  isActive,
  elapsedSeconds,
  onStart,
  onPause,
  isStarting,
  isPausing,
  size = 'default',
  className,
}: TimerButtonProps) {
  const isLoading = isStarting || isPausing;

  if (isActive) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono text-sm tabular-nums">
          <Timer className="h-3.5 w-3.5 animate-pulse" />
          {formatDuration(elapsedSeconds)}
        </div>
        <Button
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          onClick={(e) => { e.stopPropagation(); onPause(); }}
          disabled={isLoading}
          className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Pause className="h-3.5 w-3.5" />
          Pausar
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size={size === 'sm' ? 'sm' : 'default'}
      onClick={(e) => { e.stopPropagation(); onStart(); }}
      disabled={isLoading}
      className={cn('gap-1.5', className)}
    >
      <Play className="h-3.5 w-3.5" />
      {size === 'sm' ? 'Iniciar' : 'Iniciar Produção'}
    </Button>
  );
}
