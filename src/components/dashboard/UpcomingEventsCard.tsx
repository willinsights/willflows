import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video, Camera, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EventDetailsModal, EventDetails } from '@/components/calendar/EventDetailsModal';
import { EditEventModal } from '@/components/calendar/EditEventModal';
export interface UpcomingEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  eventType: string;
  projectName?: string;
  description?: string | null;
  videoCallUrl?: string | null;
  allDay?: boolean;
}

interface UpcomingEventsCardProps {
  events: UpcomingEvent[];
  loading: boolean;
  onRefresh?: () => void;
}

const eventTypeIcons: Record<string, typeof Calendar> = {
  sessao: Camera,
  reuniao: Users,
  meeting: Users,
  videocall: Video,
  deadline: Clock,
  reminder: Clock,
  outro: Calendar,
  other: Calendar,
};

function formatEventDate(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, "EEE, d MMM", { locale: pt });
}

export function UpcomingEventsCard({ events, loading, onRefresh }: UpcomingEventsCardProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDetails | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEventClick = (event: UpcomingEvent) => {
    setSelectedEvent({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      location: event.location,
      eventType: event.eventType,
      projectName: event.projectName,
      description: event.description,
      videoCallUrl: event.videoCallUrl,
      allDay: event.allDay,
    });
    setShowEventDetails(true);
  };

  const handleEditEvent = (event: EventDetails) => {
    setShowEventDetails(false);
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingEvent(null);
    onRefresh?.();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="glass-card h-[280px]">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              Próximos Compromissos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
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
              <div className="space-y-2 max-h-[195px] overflow-y-auto pr-1">
                {events.map((event) => {
                  const Icon = eventTypeIcons[event.eventType] || Calendar;
                  const isEventToday = isToday(event.startAt);
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={cn(
                        "flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
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
                          {(() => {
                            const time = format(event.startAt, 'HH:mm');
                            const isAllDay = event.allDay || time === '00:00';
                            return isAllDay ? (
                              <span className="text-muted-foreground">Dia inteiro</span>
                            ) : (
                              <>
                                <span>•</span>
                                <span>{time}</span>
                              </>
                            );
                          })()}
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

      <EventDetailsModal
        event={selectedEvent}
        open={showEventDetails}
        onOpenChange={setShowEventDetails}
        onEdit={handleEditEvent}
      />

      <EditEventModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        event={editingEvent}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
