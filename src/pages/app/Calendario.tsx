import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Camera, Film, Video, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjects } from '@/hooks/useProjects';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, any> = {
  fotografia: Camera,
  video: Film,
  foto_video: Video,
};

interface CalendarItem {
  id: string;
  title: string;
  date: Date;
  type: 'shoot' | 'delivery' | 'event' | 'meeting';
  projectType?: string;
  clientName?: string;
  time?: string;
  endTime?: string;
  meetUrl?: string;
}

export default function Calendario() {
  const { projects } = useProjects();
  const { events } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Build calendar items from projects and events
  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    // Add project shoot dates
    projects.forEach(project => {
      if (project.shoot_date) {
        items.push({
          id: `shoot-${project.id}`,
          title: project.name,
          date: parseISO(project.shoot_date),
          type: 'shoot',
          projectType: project.type,
          clientName: project.clients?.name,
          time: project.shoot_start_time || undefined,
          endTime: project.shoot_end_time || undefined,
        });
      }

      if (project.delivery_date) {
        items.push({
          id: `delivery-${project.id}`,
          title: project.name,
          date: parseISO(project.delivery_date),
          type: 'delivery',
          projectType: project.type,
          clientName: project.clients?.name,
        });
      }

      // Add meetings with google_meet_url
      if (project.google_meet_url && project.item_type === 'reuniao') {
        items.push({
          id: `meeting-${project.id}`,
          title: project.name,
          date: project.shoot_date ? parseISO(project.shoot_date) : new Date(),
          type: 'meeting',
          clientName: project.clients?.name,
          time: project.shoot_start_time || undefined,
          meetUrl: project.google_meet_url,
        });
      }
    });

    // Add calendar events
    events.forEach(event => {
      items.push({
        id: `event-${event.id}`,
        title: event.title,
        date: parseISO(event.start_at),
        type: event.event_type === 'meeting' ? 'meeting' : 'event',
        meetUrl: event.video_call_url || undefined,
      });
    });

    return items;
  }, [projects, events]);

  // Get items for a specific date
  const getItemsForDate = (date: Date) => {
    return calendarItems.filter(item => isSameDay(item.date, date));
  };

  // Get items for selected date
  const selectedDateItems = selectedDate ? getItemsForDate(selectedDate) : [];

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const getTypeColor = (type: CalendarItem['type']) => {
    switch (type) {
      case 'shoot': return 'bg-primary text-primary-foreground';
      case 'delivery': return 'bg-success text-success-foreground';
      case 'meeting': return 'bg-info text-info-foreground';
      case 'event': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: CalendarItem['type']) => {
    switch (type) {
      case 'shoot': return 'Captação';
      case 'delivery': return 'Entrega';
      case 'meeting': return 'Reunião';
      case 'event': return 'Evento';
      default: return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="text-muted-foreground">Captações, entregas e compromissos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="min-w-[140px]">
            {format(currentDate, 'MMMM yyyy', { locale: pt })}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList>
          <TabsTrigger value="month">Mês</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="day">Dia</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Captação</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span>Entrega</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-info" />
          <span>Reunião</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span>Evento</span>
        </div>
      </div>

      {/* Calendar Grid - Month View */}
      {viewMode === 'month' && (
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dayItems = getItemsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.01 }}
                    className={cn(
                      'min-h-[100px] p-2 border-b border-r border-border cursor-pointer hover:bg-muted/50 transition-colors',
                      !isCurrentMonth && 'bg-muted/20'
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className={cn(
                      'text-sm mb-1',
                      isToday && 'w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center',
                      !isCurrentMonth && 'text-muted-foreground'
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map(item => (
                        <div
                          key={item.id}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded truncate',
                            getTypeColor(item.type)
                          )}
                        >
                          {item.time && <span className="font-medium">{item.time} </span>}
                          {item.title}
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1.5">
                          +{dayItems.length - 3} mais
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-center text-muted-foreground py-8">
              Vista semanal em desenvolvimento
            </p>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-center text-muted-foreground py-8">
              Vista diária em desenvolvimento
            </p>
          </CardContent>
        </Card>
      )}

      {/* Day Details Modal */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedDateItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum evento neste dia
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateItems.map(item => {
                  const TypeIcon = item.projectType ? typeIcons[item.projectType] : CalendarIcon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        item.type === 'shoot' && 'bg-primary/10',
                        item.type === 'delivery' && 'bg-success/10',
                        item.type === 'meeting' && 'bg-info/10',
                        item.type === 'event' && 'bg-warning/10'
                      )}>
                        {TypeIcon && <TypeIcon className={cn(
                          'h-5 w-5',
                          item.type === 'shoot' && 'text-primary',
                          item.type === 'delivery' && 'text-success',
                          item.type === 'meeting' && 'text-info',
                          item.type === 'event' && 'text-warning'
                        )} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(item.type)}
                          </Badge>
                          {item.time && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.time}
                              {item.endTime && ` - ${item.endTime}`}
                            </span>
                          )}
                        </div>
                        <p className="font-medium">{item.title}</p>
                        {item.clientName && (
                          <p className="text-sm text-muted-foreground">{item.clientName}</p>
                        )}
                        {item.meetUrl && (
                          <a
                            href={item.meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-1 inline-block"
                          >
                            Abrir Google Meet
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
