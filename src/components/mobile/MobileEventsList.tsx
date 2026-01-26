import { motion } from 'framer-motion';
import { format, isToday, isTomorrow, addDays, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Video, ChevronRight, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at?: string | null;
  event_type: string;
  location?: string | null;
  video_call_url?: string | null;
  all_day?: boolean;
}

interface MobileEventsListProps {
  events: CalendarEvent[];
  loading: boolean;
  maxItems?: number;
}

const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'shoot': return 'bg-primary/10 text-primary';
    case 'meeting': return 'bg-info/10 text-info';
    case 'delivery': return 'bg-success/10 text-success';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getEventTypeLabel = (type: string) => {
  switch (type) {
    case 'shoot': return 'Gravação';
    case 'meeting': return 'Reunião';
    case 'delivery': return 'Entrega';
    default: return 'Evento';
  }
};

const getDateLabel = (date: Date) => {
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, 'EEE, d MMM', { locale: pt });
};

export function MobileEventsList({ events, loading, maxItems = 5 }: MobileEventsListProps) {
  const navigate = useNavigate();

  // Filter events within next 7 days and sort by date
  const now = new Date();
  const in7Days = addDays(now, 7);
  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.start_at);
      return isWithinInterval(eventDate, { start: now, end: in7Days });
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold">Próximos Compromissos</h2>
        </div>
        <button 
          onClick={() => navigate('/app/calendario')}
          className="text-sm text-primary font-medium flex items-center gap-1"
        >
          Calendário
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : upcomingEvents.length === 0 ? (
        <Card className="bg-muted/30 border-border/40">
          <CardContent className="py-6 text-center">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sem compromissos esta semana</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {upcomingEvents.map((event) => {
            const eventDate = new Date(event.start_at);
            const dateLabel = getDateLabel(eventDate);
            const isHighlight = isToday(eventDate);

            return (
              <Card 
                key={event.id} 
                className={cn(
                  "bg-card/80 backdrop-blur-sm border-border/60",
                  isHighlight && "ring-1 ring-primary/30"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Date Badge */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0",
                      isHighlight ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <span className="text-lg font-bold leading-none">
                        {format(eventDate, 'd')}
                      </span>
                      <span className="text-[10px] uppercase">
                        {format(eventDate, 'MMM', { locale: pt })}
                      </span>
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('text-[10px]', getEventTypeColor(event.event_type))}>
                          {getEventTypeLabel(event.event_type)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
                      </div>
                      <p className="font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {!event.all_day && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(eventDate, 'HH:mm')}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                        {event.video_call_url && (
                          <span className="flex items-center gap-1 text-info">
                            <Video className="h-3 w-3" />
                            Online
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
