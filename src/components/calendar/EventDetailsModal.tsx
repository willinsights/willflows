import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  FileText, 
  X,
  ExternalLink,
  Camera,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Google Meet icon SVG
const GoogleMeetIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <path d="M10 8l6 4-6 4V8z"/>
  </svg>
);

export interface EventDetails {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  eventType: string;
  description?: string | null;
  videoCallUrl?: string | null;
  allDay?: boolean;
  projectName?: string;
  isGoogleImport?: boolean;
}

interface EventDetailsModalProps {
  event: EventDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const eventTypeConfig: Record<string, { icon: typeof CalendarIcon; label: string; color: string }> = {
  sessao: { icon: Camera, label: 'Sessão', color: 'bg-primary text-primary-foreground' },
  reuniao: { icon: Users, label: 'Reunião', color: 'bg-info text-info-foreground' },
  meeting: { icon: Users, label: 'Reunião', color: 'bg-info text-info-foreground' },
  videocall: { icon: Video, label: 'Videochamada', color: 'bg-info text-info-foreground' },
  deadline: { icon: Clock, label: 'Deadline', color: 'bg-warning text-warning-foreground' },
  reminder: { icon: Clock, label: 'Lembrete', color: 'bg-warning text-warning-foreground' },
  outro: { icon: CalendarIcon, label: 'Evento', color: 'bg-muted text-muted-foreground' },
  other: { icon: CalendarIcon, label: 'Evento', color: 'bg-muted text-muted-foreground' },
};

function isGoogleMeetUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('meet.google.com') || url.includes('hangouts.google.com');
}

export function EventDetailsModal({ event, open, onOpenChange }: EventDetailsModalProps) {
  if (!event) return null;

  const config = eventTypeConfig[event.eventType] || eventTypeConfig.outro;
  const Icon = config.icon;
  const isMeetLink = isGoogleMeetUrl(event.videoCallUrl);

  const formatTime = (date: Date) => format(date, 'HH:mm');
  const formatDate = (date: Date) => format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg', config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight">
                {event.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {config.label}
                </Badge>
                {event.isGoogleImport && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Importado
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium capitalize">{formatDate(event.startAt)}</p>
              {!event.allDay && (
                <p className="text-sm text-muted-foreground">
                  {formatTime(event.startAt)}
                  {event.endAt && ` - ${formatTime(event.endAt)}`}
                </p>
              )}
              {event.allDay && (
                <p className="text-sm text-muted-foreground">Dia inteiro</p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{event.location}</p>
              </div>
            </div>
          )}

          {/* Video Call */}
          {event.videoCallUrl && (
            <div className="flex items-start gap-3">
              {isMeetLink ? (
                <GoogleMeetIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              ) : (
                <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
              )}
              <div className="flex-1">
                <a
                  href={event.videoCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  {isMeetLink ? 'Entrar no Google Meet' : 'Abrir videochamada'}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Project */}
          {event.projectName && (
            <div className="flex items-start gap-3">
              <Camera className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Projeto</p>
                <p className="font-medium">{event.projectName}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Descrição</p>
                <p className="text-sm whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
