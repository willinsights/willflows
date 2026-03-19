import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ArrowRight, Play, Pause, MoveRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeSession, ColumnTransition } from '@/hooks/useTimeTracking';

interface TimelineEvent {
  type: 'timer_start' | 'timer_end' | 'column_move';
  timestamp: string;
  description: string;
  icon: typeof Play;
  color: string;
}

interface ProjectTimelineProps {
  sessions: TimeSession[];
  transitions: ColumnTransition[];
  columnNames?: Record<string, string>;
  maxItems?: number;
}

export function ProjectTimeline({ sessions, transitions, columnNames = {}, maxItems = 20 }: ProjectTimelineProps) {
  // Merge sessions and transitions into a timeline
  const events: TimelineEvent[] = [];

  sessions.forEach((s) => {
    events.push({
      type: 'timer_start',
      timestamp: s.started_at,
      description: 'Timer iniciado',
      icon: Play,
      color: 'text-primary',
    });
    if (s.ended_at) {
      events.push({
        type: 'timer_end',
        timestamp: s.ended_at,
        description: 'Timer pausado',
        icon: Pause,
        color: 'text-warning',
      });
    }
  });

  transitions.forEach((t) => {
    const fromName = t.from_column_id ? (columnNames[t.from_column_id] || 'Anterior') : 'Início';
    const toName = columnNames[t.to_column_id] || 'Coluna';
    events.push({
      type: 'column_move',
      timestamp: t.moved_at,
      description: `${fromName} → ${toName}`,
      icon: MoveRight,
      color: 'text-muted-foreground',
    });
  });

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const displayed = events.slice(0, maxItems);

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-3">
        Sem eventos registados
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {displayed.map((event, idx) => {
        const Icon = event.icon;
        return (
          <div key={`${event.type}-${event.timestamp}-${idx}`} className="flex items-start gap-2 py-1.5">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={cn('rounded-full p-0.5', event.color)}>
                <Icon className="h-3 w-3" />
              </div>
              {idx < displayed.length - 1 && (
                <div className="w-px h-full bg-border flex-1 min-h-[12px]" />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="text-xs text-foreground">{event.description}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                {format(new Date(event.timestamp), 'dd MMM HH:mm', { locale: pt })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
