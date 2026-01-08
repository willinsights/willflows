import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, MapPin, Camera, Video, Grip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  foto_video: 'Foto+Vídeo',
};

const priorityConfig = {
  baixa: { class: 'priority-baixa', label: 'Baixa' },
  media: { class: 'priority-media', label: 'Média' },
  alta: { class: 'priority-alta', label: 'Alta' },
  urgente: { class: 'priority-urgente', label: 'Urgente' },
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'kanban-card group',
        isDragging && 'dragging opacity-50 z-50'
      )}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <Grip className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Type and Priority Badges */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs gap-1">
          <TypeIcon className="h-3 w-3" />
          {typeLabels[project.type]}
        </Badge>
        {project.priority !== 'media' && (
          <Badge className={cn('text-xs', priorityInfo.class)}>
            {priorityInfo.label}
          </Badge>
        )}
      </div>

      {/* Project Name */}
      <h4 className="font-medium text-sm mb-1 line-clamp-2">
        {project.name}
      </h4>

      {/* Client Name */}
      {project.clients?.name && (
        <p className="text-xs text-muted-foreground mb-2 truncate">
          {project.clients.name}
        </p>
      )}

      {/* Location */}
      {project.city && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{project.city}</span>
        </div>
      )}

      {/* Footer with date */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        {project.shoot_date ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(project.shoot_date), 'dd MMM', { locale: pt })}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sem data</span>
        )}

        {/* Category badge */}
        {project.category !== 'outro' && (
          <Badge variant="secondary" className="text-xs">
            {project.category === 'hotel' ? 'Hotel' : 
             project.category === 'experiencia' ? 'Experiência' : 
             project.category === 'evento' ? 'Evento' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}
