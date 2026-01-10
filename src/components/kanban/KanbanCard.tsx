import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, differenceInDays, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, MapPin, Camera, Video, Grip, CheckSquare, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/hooks/useKanban';

interface KanbanCardProps {
  project: ProjectWithClient;
  onClick?: () => void;
}

const typeIcons = {
  fotografia: Camera,
  video: Video,
  foto_video: Camera,
};

const typeLabels = {
  fotografia: 'Foto',
  video: 'Vídeo',
  foto_video: 'F+V',
};

const priorityConfig = {
  baixa: { class: 'priority-baixa', label: 'Baixa', border: '' },
  media: { class: 'priority-media', label: 'Média', border: '' },
  alta: { class: 'priority-alta', label: 'Alta', border: 'border-l-2 border-l-warning' },
  urgente: { class: 'priority-urgente', label: 'Urgente', border: 'border-l-2 border-l-destructive' },
};

export function KanbanCard({ project, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const TypeIcon = typeIcons[project.type];
  const priorityInfo = priorityConfig[project.priority];

  // Check if deadline is near or passed
  const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
  const daysUntilDelivery = deliveryDate ? differenceInDays(deliveryDate, new Date()) : null;
  const isOverdue = deliveryDate && isPast(deliveryDate);
  const isUrgentDeadline = daysUntilDelivery !== null && daysUntilDelivery <= 3 && daysUntilDelivery >= 0;

  // Task progress
  const taskCount = project.task_count || 0;
  const taskCompleted = project.task_completed || 0;
  const taskProgress = taskCount > 0 ? (taskCompleted / taskCount) * 100 : 0;

  // Get team members (limit display to 3)
  const teamMembers = project.team_members || [];
  const displayedMembers = teamMembers.slice(0, 3);
  const remainingCount = teamMembers.length - 3;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'kanban-card group relative transition-all duration-300 cursor-grab active:cursor-grabbing',
        'hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 hover:z-10',
        'focus-within:ring-2 focus-within:ring-primary/20',
        isDragging && 'dragging opacity-60 z-50 scale-105 shadow-2xl shadow-primary/20',
        priorityInfo.border,
        isOverdue && 'border-destructive/40 bg-destructive/5',
        isUrgentDeadline && !isOverdue && 'border-warning/40 bg-warning/5'
      )}
      onClick={onClick}
    >
      {/* Drag Handle - visual indicator only */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded">
        <Grip className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Header: Type + Priority */}
      <div className="flex items-center gap-1 mb-1">
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 gap-0.5 font-normal">
          <TypeIcon className="h-2.5 w-2.5" />
          {typeLabels[project.type]}
        </Badge>
        {(project.priority === 'alta' || project.priority === 'urgente') && (
          <Badge className={cn('text-[9px] px-1 py-0 h-4 font-medium', priorityInfo.class)}>
            {priorityInfo.label}
          </Badge>
        )}
        {isOverdue && (
          <AlertTriangle className="h-3 w-3 text-destructive ml-auto" />
        )}
      </div>

      {/* Project Name */}
      <h4 className="font-medium text-[11px] leading-tight mb-0.5 line-clamp-2 pr-4">
        {project.name}
      </h4>

      {/* Client Name */}
      {project.clients?.name && (
        <p className="text-[10px] text-muted-foreground mb-1 truncate">
          {project.clients.name}
        </p>
      )}

      {/* Location (optional, compact) */}
      {project.city && (
        <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground mb-1">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{project.city}</span>
        </div>
      )}

      {/* Task Progress (if exists) */}
      {taskCount > 0 && (
        <div className="mb-1">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
            <span className="flex items-center gap-0.5">
              <CheckSquare className="h-2.5 w-2.5" />
              Tarefas
            </span>
            <span>{taskCompleted}/{taskCount}</span>
          </div>
          <Progress value={taskProgress} className="h-0.5" />
        </div>
      )}

      {/* Footer with date and team */}
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/40">
        <div className="flex items-center gap-1">
          {project.shoot_date ? (
            <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              <span>{format(new Date(project.shoot_date), 'dd MMM', { locale: pt })}</span>
            </div>
          ) : deliveryDate ? (
            <div className={cn(
              'flex items-center gap-0.5 text-[9px]',
              isOverdue ? 'text-destructive' : isUrgentDeadline ? 'text-warning' : 'text-muted-foreground'
            )}>
              <Calendar className="h-2.5 w-2.5" />
              <span>{format(deliveryDate, 'dd MMM', { locale: pt })}</span>
            </div>
          ) : (
            <span className="text-[9px] text-muted-foreground">-</span>
          )}
        </div>

        {/* Team Avatars */}
        {displayedMembers.length > 0 && (
          <TooltipProvider>
            <div className="flex -space-x-1.5">
              {displayedMembers.map((member) => {
                const initials = member.profile?.full_name
                  ? member.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : member.profile?.email?.[0]?.toUpperCase() || '?';
                
                return (
                  <Tooltip key={member.user_id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-4 w-4 border border-background">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[6px] bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] px-2 py-1">
                      <p>{member.profile?.full_name || member.profile?.email}</p>
                      <p className="text-muted-foreground capitalize">{member.phase}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {remainingCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-4 w-4 border border-background">
                      <AvatarFallback className="text-[6px] bg-muted text-muted-foreground">
                        +{remainingCount}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] px-2 py-1">
                    <p>+{remainingCount} mais</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Project code - only show if no team members */}
        {displayedMembers.length === 0 && (project as any).project_code && (
          <span className="text-[9px] text-primary/60 font-mono">
            {(project as any).project_code}
          </span>
        )}
      </div>
    </div>
  );
}
