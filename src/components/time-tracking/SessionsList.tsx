import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Clock, User } from 'lucide-react';
import { formatDuration, type TimeSession } from '@/hooks/useTimeTracking';
import { cn } from '@/lib/utils';

interface SessionsListProps {
  sessions: TimeSession[];
  maxItems?: number;
}

export function SessionsList({ sessions, maxItems = 10 }: SessionsListProps) {
  const displayed = sessions.slice(0, maxItems);

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Sem sessões registadas
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {displayed.map((session) => {
        const startDate = new Date(session.started_at);
        const endDate = session.ended_at ? new Date(session.ended_at) : null;
        const duration = session.duration_seconds 
          ?? (endDate ? Math.floor((endDate.getTime() - startDate.getTime()) / 1000) : 0);
        const isActive = !session.ended_at;

        return (
          <div
            key={session.id}
            className={cn(
              'flex items-center justify-between py-1.5 px-2 rounded-md text-xs',
              isActive ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
            )}
          >
            <div className="flex items-center gap-2">
              <Clock className={cn('h-3 w-3', isActive ? 'text-primary animate-pulse' : 'text-muted-foreground')} />
              <span className="text-muted-foreground">
                {format(startDate, 'dd MMM HH:mm', { locale: pt })}
                {endDate ? ` — ${format(endDate, 'HH:mm')}` : ' — em curso'}
              </span>
            </div>
            <span className={cn('font-mono font-medium', isActive ? 'text-primary' : 'text-foreground')}>
              {isActive ? 'Ativo' : formatDuration(duration)}
            </span>
          </div>
        );
      })}
      {sessions.length > maxItems && (
        <p className="text-[10px] text-muted-foreground text-center">
          +{sessions.length - maxItems} sessões anteriores
        </p>
      )}
    </div>
  );
}
