import { useState, useMemo, useCallback } from 'react';
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
  subDays,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Camera, Film, Video, Calendar as CalendarIcon, Clock, ExternalLink, Plus, GripVertical } from 'lucide-react';
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
import { useProjects, ProjectWithClient } from '@/hooks/useProjects';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal';
import { CreateEventModal } from '@/components/calendar/CreateEventModal';
import { DraggableCalendarItem, CalendarItem, getTypeColor, getTypeLabel } from '@/components/calendar/DraggableCalendarItem';
import { DroppableCalendarSlot } from '@/components/calendar/DroppableCalendarSlot';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, any> = {
  fotografia: Camera,
  video: Film,
  foto_video: Video,
};

export default function Calendario() {
  const { projects, refresh, updateProject } = useProjects();
  const { events, createEvent, refresh: refreshEvents } = useCalendarEvents();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectWithClient | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [newEventHour, setNewEventHour] = useState<number | undefined>();
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Build calendar items from projects and events
  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    // Add project shoot dates
    projects.forEach(project => {
      if (project.shoot_date) {
        items.push({
          id: `shoot-${project.id}`,
          projectId: project.id,
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
          projectId: project.id,
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
          projectId: project.id,
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
        projectId: event.project_id || undefined,
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

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [currentDate]);

  // Hours for day/week view
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current as CalendarItem;
    setActiveItem(item);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveItem(null);
    
    const { active, over } = event;
    if (!over) return;

    const draggedItem = active.data.current as CalendarItem;
    const dropData = over.data.current as { date: Date; hour?: number };
    
    if (!draggedItem || !dropData?.date || !draggedItem.projectId) return;
    
    // Check if date actually changed
    if (isSameDay(draggedItem.date, dropData.date)) return;

    const newDate = format(dropData.date, 'yyyy-MM-dd');
    
    // Determine which field to update based on item type
    if (draggedItem.type === 'shoot') {
      await updateProject(draggedItem.projectId, { shoot_date: newDate });
      toast({
        title: 'Data de captação atualizada',
        description: `${draggedItem.title} movido para ${format(dropData.date, "d 'de' MMMM", { locale: pt })}`,
      });
    } else if (draggedItem.type === 'delivery') {
      await updateProject(draggedItem.projectId, { delivery_date: newDate });
      toast({
        title: 'Data de entrega atualizada',
        description: `${draggedItem.title} movido para ${format(dropData.date, "d 'de' MMMM", { locale: pt })}`,
      });
    }
    
    refresh();
  }, [updateProject, refresh, toast]);

  // Handle item click to open project details
  const handleItemClick = (item: CalendarItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.projectId) {
      const project = projects.find(p => p.id === item.projectId);
      if (project) {
        setSelectedProject(project);
        setShowProjectDetails(true);
        setSelectedDate(null);
      }
    }
  };

  // Handle empty slot click to create new event
  const handleSlotClick = (date: Date, hour?: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNewEventDate(date);
    setNewEventHour(hour);
    setShowCreateEvent(true);
  };

  // Handle event creation
  const handleCreateEvent = async (eventData: {
    title: string;
    description?: string;
    start_at: string;
    end_at?: string;
    all_day: boolean;
    location?: string;
    event_type: string;
    video_call_url?: string;
  }) => {
    const result = await createEvent(eventData);
    if (result) {
      refreshEvents();
    }
    return result;
  };

  // Navigation handlers based on view mode
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const getHeaderLabel = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: pt });
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM', { locale: pt })} - ${format(weekEnd, 'd MMM yyyy', { locale: pt })}`;
    } else {
      return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: pt });
    }
  };

  // Parse time string to hour number
  const parseTimeToHour = (timeStr?: string): number | null => {
    if (!timeStr) return null;
    const match = timeStr.match(/^(\d{1,2})/);
    return match ? parseInt(match[1], 10) : null;
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
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="min-w-[180px] capitalize">
            {getHeaderLabel()}
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => handleSlotClick(currentDate)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Evento
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
      <div className="flex flex-wrap items-center gap-4 text-sm">
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
        <div className="flex items-center gap-2 ml-auto text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span className="text-xs">Arraste captações e entregas para mover datas</span>
        </div>
      </div>

      {/* Calendar Grid - Month View */}
      {viewMode === 'month' && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                    <DroppableCalendarSlot
                      key={index}
                      id={`month-day-${format(day, 'yyyy-MM-dd')}`}
                      date={day}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'min-h-[100px] p-2 border-b border-r border-border cursor-pointer hover:bg-muted/50 transition-colors',
                        !isCurrentMonth && 'bg-muted/20'
                      )}
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
                          <DraggableCalendarItem
                            key={item.id}
                            item={item}
                            onClick={handleItemClick}
                            variant="compact"
                          />
                        ))}
                        {dayItems.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1.5">
                            +{dayItems.length - 3} mais
                          </div>
                        )}
                      </div>
                    </DroppableCalendarSlot>
                  );
                })}
              </div>

              {/* Empty State Overlay for no items */}
              {calendarItems.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Calendário vazio</h3>
                  <p className="text-muted-foreground text-sm max-w-xs text-center">
                    Comece adicionando projetos com datas de captação ou crie eventos.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem && (
              <div className={cn(
                'text-xs px-2 py-1 rounded shadow-lg',
                getTypeColor(activeItem.type)
              )}>
                {activeItem.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              {/* Weekday Headers */}
              <div className="grid grid-cols-8 border-b border-border">
                <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-border">
                  Hora
                </div>
                {weekDays.map((day, index) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "p-3 text-center border-r border-border last:border-r-0",
                        isToday && "bg-primary/10"
                      )}
                    >
                      <div className="text-sm font-medium text-muted-foreground">
                        {format(day, 'EEE', { locale: pt })}
                      </div>
                      <div className={cn(
                        "text-lg font-semibold",
                        isToday && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <div className="max-h-[600px] overflow-y-auto">
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 border-b border-border min-h-[60px]">
                    <div className="p-2 text-xs text-muted-foreground border-r border-border flex items-start justify-center">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const dayItems = getItemsForDate(day).filter(item => {
                        const itemHour = parseTimeToHour(item.time);
                        return itemHour === hour || (!item.time && hour === 8);
                      });
                      const isToday = isSameDay(day, new Date());

                      return (
                        <DroppableCalendarSlot
                          key={dayIndex}
                          id={`week-slot-${format(day, 'yyyy-MM-dd')}-${hour}`}
                          date={day}
                          hour={hour}
                          onClick={(e) => handleSlotClick(day, hour, e)}
                          className={cn(
                            "p-1 border-r border-border last:border-r-0 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors min-h-[60px]",
                            isToday && "bg-primary/5 hover:bg-primary/10"
                          )}
                        >
                          {dayItems.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-50 transition-opacity">
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          {dayItems.map(item => (
                            <DraggableCalendarItem
                              key={item.id}
                              item={item}
                              onClick={handleItemClick}
                              variant="compact"
                            />
                          ))}
                        </DroppableCalendarSlot>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem && (
              <div className={cn(
                'text-xs px-2 py-1 rounded shadow-lg',
                getTypeColor(activeItem.type)
              )}>
                {activeItem.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              {/* Day Header */}
              <div className={cn(
                "p-4 border-b border-border text-center",
                isSameDay(currentDate, new Date()) && "bg-primary/10"
              )}>
                <div className="text-lg font-semibold capitalize">
                  {format(currentDate, "EEEE, d 'de' MMMM", { locale: pt })}
                </div>
                {isSameDay(currentDate, new Date()) && (
                  <Badge variant="secondary" className="mt-1">Hoje</Badge>
                )}
              </div>

              {/* Time Slots */}
              <div className="max-h-[600px] overflow-y-auto">
                {hours.map(hour => {
                  const dayItems = getItemsForDate(currentDate).filter(item => {
                    const itemHour = parseTimeToHour(item.time);
                    return itemHour === hour || (!item.time && hour === 8);
                  });

                  return (
                    <DroppableCalendarSlot
                      key={hour}
                      id={`day-slot-${format(currentDate, 'yyyy-MM-dd')}-${hour}`}
                      date={currentDate}
                      hour={hour}
                      onClick={(e) => dayItems.length === 0 ? handleSlotClick(currentDate, hour, e) : undefined}
                      className={cn(
                        "flex border-b border-border min-h-[80px]",
                        dayItems.length === 0 && "cursor-pointer hover:bg-muted/30 transition-colors"
                      )}
                    >
                      <div className="w-20 p-3 text-sm text-muted-foreground border-r border-border flex-shrink-0">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="flex-1 p-2 space-y-2">
                        {dayItems.map(item => (
                          <DraggableCalendarItem
                            key={item.id}
                            item={item}
                            onClick={handleItemClick}
                            variant="full"
                          />
                        ))}
                        {dayItems.length === 0 && hour === 8 && getItemsForDate(currentDate).length === 0 && (
                          <div className="text-sm text-muted-foreground italic">
                            Sem eventos - clique para adicionar
                          </div>
                        )}
                      </div>
                    </DroppableCalendarSlot>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem && (
              <div className={cn(
                'px-3 py-2 rounded-lg shadow-lg',
                getTypeColor(activeItem.type)
              )}>
                <div className="font-medium">{activeItem.title}</div>
                {activeItem.clientName && (
                  <div className="text-sm opacity-80">{activeItem.clientName}</div>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Day Details Modal */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
            </DialogTitle>
          </DialogHeader>
          
          {/* Add Event Button */}
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => {
              if (selectedDate) {
                handleSlotClick(selectedDate);
                setSelectedDate(null);
              }
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar Evento
          </Button>
          
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
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg bg-muted/50 transition-colors",
                        item.projectId && "cursor-pointer hover:bg-muted/70"
                      )}
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
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Abrir Google Meet
                          </a>
                        )}
                        {item.projectId && (
                          <p className="text-xs text-primary mt-1">Clique para ver detalhes →</p>
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

      {/* Project Details Modal */}
      {selectedProject && (
        <ProjectDetailsModal
          open={showProjectDetails}
          onOpenChange={setShowProjectDetails}
          project={selectedProject}
          onUpdate={() => {
            refresh();
            setSelectedProject(null);
          }}
        />
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onSubmit={handleCreateEvent}
        initialDate={newEventDate}
        initialHour={newEventHour}
      />
    </div>
  );
}
