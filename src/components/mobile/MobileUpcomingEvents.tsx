import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video, Camera, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isToday, isTomorrow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { UpcomingEvent } from '@/components/dashboard/UpcomingEventsCard';
import { EventDetailsModal, EventDetails } from '@/components/calendar/EventDetailsModal';
import { EditEventModal } from '@/components/calendar/EditEventModal';

interface MobileUpcomingEventsProps {
  events: UpcomingEvent[];
  loading: boolean;
  maxItems?: number;
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

export function MobileUpcomingEvents({ 
  events, 
  loading,
  maxItems = 3,
  onRefresh,
}: MobileUpcomingEventsProps) {
  const navigate = useNavigate();
  const displayedEvents = events.slice(0, maxItems);
  const hasMore = events.length > maxItems;
  
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              Próximos Compromissos
            </CardTitle>
            {hasMore && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary h-7 text-xs px-2" 
                onClick={() => navigate('/app/calendario')}
              >
                +{events.length - maxItems}
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sem eventos próximos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedEvents.map((event) => {
                  const Icon = eventTypeIcons[event.eventType] || Calendar;
                  const isEventToday = isToday(event.startAt);
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer active:scale-[0.98]",
                        isEventToday 
                          ? "bg-primary/10 border border-primary/20" 
                          : "bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl shrink-0",
                        isEventToday ? "bg-primary/20" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          isEventToday ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className={cn(isEventToday && "text-primary font-medium")}>
                            {formatEventDate(event.startAt)}
                          </span>
                          <span>•</span>
                          <span>{format(event.startAt, 'HH:mm')}</span>
                          {event.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 truncate max-w-[100px]">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            </>
                          )}
                        </div>
                        {event.projectName && (
                          <Badge variant="secondary" className="mt-1.5 text-[10px] h-5">
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
