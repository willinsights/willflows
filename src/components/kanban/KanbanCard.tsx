import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, differenceInDays, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, MapPin, Camera, Video, Grip, CheckSquare, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'kanban-card group relative',
        isDragging && 'dragging opacity-50 z-50',
        priorityInfo.border,
        isOverdue && 'border-destructive/50 bg-destructive/5',
        isUrgentDeadline && !isOverdue && 'border-warning/50 bg-warning/5'
      )}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5"
      >
        <Grip className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Header: Type + Priority */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
          <TypeIcon className="h-2.5 w-2.5" />
          {typeLabels[project.type]}
        </Badge>
        {(project.priority === 'alta' || project.priority === 'urgente') && (
          <Badge className={cn('text-[10px] px-1.5 py-0 h-5', priorityInfo.class)}>
            {priorityInfo.label}
          </Badge>
        )}
        {isOverdue && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" />
          </Badge>
        )}
      </div>

      {/* Project Name */}
      <h4 className="font-medium text-xs leading-tight mb-1 line-clamp-2 pr-5">
        {project.name}
      </h4>

      {/* Client Name */}
      {project.clients?.name && (
        <p className="text-[11px] text-muted-foreground mb-1.5 truncate">
          {project.clients.name}
        </p>
      )}

      {/* Location (optional, compact) */}
      {project.city && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
          <MapPin className="h-2.5 w-2.5" />
          <span className="truncate">{project.city}</span>
        </div>
      )}

      {/* Task Progress (if exists) */}
      {taskCount > 0 && (
        <div className="mb-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
            <span className="flex items-center gap-0.5">
              <CheckSquare className="h-2.5 w-2.5" />
              Tarefas
            </span>
            <span>{taskCompleted}/{taskCount}</span>
          </div>
          <Progress value={taskProgress} className="h-1" />
        </div>
      )}

      {/* Footer with date */}
      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/30">
        {project.shoot_date ? (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-2.5 w-2.5" />
            <span>{format(new Date(project.shoot_date), 'dd MMM', { locale: pt })}</span>
          </div>
        ) : deliveryDate ? (
          <div className={cn(
            'flex items-center gap-1 text-[10px]',
            isOverdue ? 'text-destructive' : isUrgentDeadline ? 'text-warning' : 'text-muted-foreground'
          )}>
            <Calendar className="h-2.5 w-2.5" />
            <span>{format(deliveryDate, 'dd MMM', { locale: pt })}</span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">-</span>
        )}

        {/* Project code */}
        {(project as any).project_code && (
          <span className="text-[10px] text-primary/70 font-mono">
            {(project as any).project_code}
          </span>
        )}
      </div>
    </div>
  );
}
