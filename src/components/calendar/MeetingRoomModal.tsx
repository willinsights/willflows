import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Video,
  Copy,
  Check,
  ExternalLink,
  Calendar as CalendarIcon,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface MeetingRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetUrl: string;
  title?: string;
  startAt?: Date;
  endAt?: Date | null;
  description?: string | null;
}

export function MeetingRoomModal({
  open,
  onOpenChange,
  meetUrl,
  title,
  startAt,
  endAt,
  description,
}: MeetingRoomModalProps) {
  const [copied, setCopied] = useState(false);

  const handleJoin = () => {
    window.open(meetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(meetUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {title || 'Sala de Reunião'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Google Meet
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Join Button */}
          <Button
            size="lg"
            className="w-full gap-2 h-12 text-base"
            onClick={handleJoin}
          >
            <Video className="h-5 w-5" />
            Entrar na Reunião
            <ExternalLink className="h-4 w-4 ml-1 opacity-60" />
          </Button>

          <p className="text-xs text-center text-muted-foreground -mt-2">
            Abre o Google Meet num novo separador
          </p>

          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Link para convidar participantes
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg border bg-muted/50 text-sm truncate select-all">
                {meetUrl}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Event Details */}
          {(startAt || description) && (
            <div className="space-y-3 pt-3 border-t">
              {startAt && (
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {format(startAt, "EEEE, d 'de' MMMM", { locale: pt })}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(startAt, 'HH:mm')}
                      {endAt && ` - ${format(endAt, 'HH:mm')}`}
                    </p>
                  </div>
                </div>
              )}

              {description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                    {description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
