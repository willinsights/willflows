import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Camera, Film, Video, Calendar as CalendarIcon, ExternalLink, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, any> = {
  fotografia: Camera,
  video: Film,
  foto_video: Video,
};

export interface CalendarItem {
  id: string;
  projectId?: string;
  title: string;
  date: Date;
  type: 'shoot' | 'delivery' | 'event' | 'meeting';
  projectType?: string;
  clientName?: string;
  time?: string;
  endTime?: string;
  meetUrl?: string;
}

interface DraggableCalendarItemProps {
  item: CalendarItem;
  onClick: (item: CalendarItem, e?: React.MouseEvent) => void;
  variant?: 'compact' | 'full';
  isDragDisabled?: boolean;
}

export function getTypeColor(type: CalendarItem['type']) {
  switch (type) {
    case 'shoot': return 'bg-primary text-primary-foreground';
    case 'delivery': return 'bg-success text-success-foreground';
    case 'meeting': return 'bg-info text-info-foreground';
    case 'event': return 'bg-warning text-warning-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function getTypeLabel(type: CalendarItem['type']) {
  switch (type) {
    case 'shoot': return 'Captação';
    case 'delivery': return 'Entrega';
    case 'meeting': return 'Reunião';
    case 'event': return 'Evento';
    default: return type;
  }
}

export function DraggableCalendarItem({ 
  item, 
  onClick, 
  variant = 'compact',
  isDragDisabled = false 
}: DraggableCalendarItemProps) {
  const canDrag = (item.type === 'shoot' || item.type === 'delivery') && item.projectId && !isDragDisabled;
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
    disabled: !canDrag,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : undefined,
  } : undefined;

  const TypeIcon = item.projectType ? typeIcons[item.projectType] : CalendarIcon;

  if (variant === 'compact') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1',
          getTypeColor(item.type),
          isDragging && 'opacity-50 shadow-lg ring-2 ring-primary'
        )}
        onClick={(e) => onClick(item, e)}
      >
        {canDrag && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 opacity-60" />
          </span>
        )}
        <span className="truncate">
          {item.time && <span className="font-medium">{item.time} </span>}
          {item.title}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity',
        getTypeColor(item.type),
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary'
      )}
      onClick={(e) => onClick(item, e)}
    >
      {canDrag && (
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 opacity-60" />
        </span>
      )}
      {TypeIcon && <TypeIcon className="h-5 w-5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.title}</div>
        {item.clientName && (
          <div className="text-sm opacity-80 truncate">{item.clientName}</div>
        )}
      </div>
      <div className="text-sm opacity-80 flex-shrink-0">
        {item.time && (
          <span>
            {item.time}
            {item.endTime && ` - ${item.endTime}`}
          </span>
        )}
      </div>
      {item.meetUrl && (
        <a
          href={item.meetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
