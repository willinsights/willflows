import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video, Camera, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface UpcomingEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  eventType: string;
  projectName?: string;
}

interface UpcomingEventsCardProps {
  events: UpcomingEvent[];
  loading: boolean;
}

const eventTypeIcons: Record<string, typeof Calendar> = {
  sessao: Camera,
  reuniao: Users,
  videocall: Video,
  deadline: Clock,
  outro: Calendar,
};

const eventTypeLabels: Record<string, string> = {
  sessao: 'Sessão',
  reuniao: 'Reunião',
  videocall: 'Videochamada',
  deadline: 'Deadline',
  outro: 'Evento',
};

function formatEventDate(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, "EEE, d MMM", { locale: pt });
}

export function UpcomingEventsCard({ events, loading }: UpcomingEventsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sem eventos próximos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const Icon = eventTypeIcons[event.eventType] || Calendar;
                const isEventToday = isToday(event.startAt);
                
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50",
                      isEventToday && "bg-primary/5 border border-primary/20"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-md",
                      isEventToday ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4",
                        isEventToday ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className={cn(isEventToday && "text-primary font-medium")}>
                          {formatEventDate(event.startAt)}
                        </span>
                        <span>•</span>
                        <span>{format(event.startAt, 'HH:mm')}</span>
                        {event.location && (
                          <>
                            <span>•</span>
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{event.location}</span>
                          </>
                        )}
                      </div>
                      {event.projectName && (
                        <Badge variant="secondary" className="mt-1 text-[10px] h-5">
                          {event.projectName}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
