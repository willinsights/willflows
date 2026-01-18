import { useFollowups } from '@/hooks/useFollowups';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Flag,
  CheckCircle,
  Clock,
  MessageSquare,
  User,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FollowUpInboxProps {
  onClose: () => void;
}

export function FollowUpInbox({ onClose }: FollowUpInboxProps) {
  const { followups, isLoading, markAsDone } = useFollowups();

  const openFollowups = followups.filter((f) => f.status === 'open');
  const doneFollowups = followups.filter((f) => f.status === 'done');

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-warning" />
          <h2 className="font-semibold">FollowUps</h2>
          {openFollowups.length > 0 && (
            <Badge variant="secondary">{openFollowups.length}</Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Open Followups */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Pendentes ({openFollowups.length})
            </h3>

            {openFollowups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tudo em dia!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openFollowups.map((followup) => (
                  <FollowUpItem
                    key={followup.id}
                    followup={followup}
                    onMarkDone={() => markAsDone.mutate(followup.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Done Followups */}
          {doneFollowups.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Concluídos ({doneFollowups.length})
              </h3>
              <div className="space-y-2 opacity-60">
                {doneFollowups.slice(0, 5).map((followup) => (
                  <FollowUpItem
                    key={followup.id}
                    followup={followup}
                    isDone
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface FollowUpItemProps {
  followup: {
    id: string;
    message?: {
      id: string;
      body: string;
      user?: {
        full_name?: string;
      };
    } | null;
    due_at?: string | null;
    note?: string | null;
    status: string;
    done_at?: string | null;
    created_by_user?: {
      full_name?: string;
    };
  };
  onMarkDone?: () => void;
  isDone?: boolean;
}

function FollowUpItem({ followup, onMarkDone, isDone = false }: FollowUpItemProps) {
  const isOverdue = followup.due_at && isPast(new Date(followup.due_at)) && !isDone;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-border bg-card transition-colors',
        'hover:border-primary/30',
        isDone && 'bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3">
        {!isDone && onMarkDone && (
          <Checkbox
            checked={isDone}
            onCheckedChange={() => onMarkDone()}
            className="mt-1"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Message Preview */}
          <p
            className={cn(
              'text-sm line-clamp-2',
              isDone && 'line-through text-muted-foreground'
            )}
          >
            {followup.message?.body || 'Mensagem não encontrada'}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
            {followup.message?.user?.full_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {followup.message.user.full_name}
              </span>
            )}

            {followup.due_at && (
              <span
                className={cn(
                  'flex items-center gap-1',
                  isOverdue && 'text-destructive'
                )}
              >
                <Clock className="h-3 w-3" />
                {format(new Date(followup.due_at), 'dd MMM', { locale: pt })}
                {isOverdue && ' (vencido)'}
              </span>
            )}

            {isDone && followup.done_at && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle className="h-3 w-3" />
                Concluído{' '}
                {formatDistanceToNow(new Date(followup.done_at), {
                  addSuffix: true,
                  locale: pt,
                })}
              </span>
            )}
          </div>

          {/* Note */}
          {followup.note && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              "{followup.note}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
