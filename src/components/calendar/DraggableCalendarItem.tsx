import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Camera, Film, Video, Calendar as CalendarIcon, ExternalLink, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Google Meet icon SVG
const GoogleMeetIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <path d="M10 8l6 4-6 4V8z"/>
  </svg>
);

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
  isGoogleImport?: boolean;
}

interface DraggableCalendarItemProps {
  item: CalendarItem;
  onClick: (item: CalendarItem, e?: React.MouseEvent) => void;
  variant?: 'compact' | 'full';
  isDragDisabled?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (itemId: string) => void;
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

function isGoogleMeetUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('meet.google.com') || url.includes('hangouts.google.com');
}

export function DraggableCalendarItem({ 
  item, 
  onClick, 
  variant = 'compact',
  isDragDisabled = false,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: DraggableCalendarItemProps) {
  const canDrag = (item.type === 'shoot' || item.type === 'delivery') && item.projectId && !isDragDisabled && !selectionMode;
  const isDeletable = (item.type === 'event' || item.type === 'meeting') && !item.isGoogleImport;
  
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
  const isMeetLink = isGoogleMeetUrl(item.meetUrl);

  if (variant === 'compact') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1',
          getTypeColor(item.type),
          item.isGoogleImport && 'border border-dashed border-current/50 bg-opacity-60',
          isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
          selectionMode && isSelected && 'ring-2 ring-primary-foreground'
        )}
        onClick={(e) => {
          if (selectionMode && isDeletable && onToggleSelect) {
            e.stopPropagation();
            onToggleSelect(item.id.replace('event-', ''));
            return;
          }
          onClick(item, e);
        }}
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
        {item.isGoogleImport && (
          <svg className="h-3 w-3 flex-shrink-0 opacity-70" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        )}
        {item.meetUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={item.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 hover:opacity-80"
              >
                {isMeetLink ? (
                  <GoogleMeetIcon className="h-3 w-3" />
                ) : (
                  <Video className="h-3 w-3" />
                )}
              </a>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isMeetLink ? 'Entrar no Google Meet' : 'Abrir videochamada'}
            </TooltipContent>
          </Tooltip>
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
        item.isGoogleImport && 'border border-dashed border-current/50 bg-opacity-60',
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
      {item.isGoogleImport ? (
        <svg className="h-5 w-5 flex-shrink-0 opacity-70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      ) : (
        TypeIcon && <TypeIcon className="h-5 w-5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.title}</div>
        {item.clientName && (
          <div className="text-sm opacity-80 truncate">{item.clientName}</div>
        )}
        {item.isGoogleImport && (
          <div className="text-xs opacity-60">Importado do Google Calendar</div>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={item.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 p-1.5 rounded-md hover:bg-white/20 transition-colors"
            >
              {isMeetLink ? (
                <GoogleMeetIcon className="h-5 w-5" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
            </a>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isMeetLink ? 'Entrar no Google Meet' : 'Abrir videochamada'}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
