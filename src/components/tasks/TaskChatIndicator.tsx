import { MessageCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTaskChatStatus } from '@/hooks/useTaskChatStatus';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskChatIndicatorProps {
  taskId: string;
  onOpenChat?: () => void;
}

export function TaskChatIndicator({ taskId, onOpenChat }: TaskChatIndicatorProps) {
  const navigate = useNavigate();
  const { hasChat, conversationId, unreadCount, isLoading } = useTaskChatStatus(taskId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (!hasChat) {
    return null;
  }

  const handleOpenChat = () => {
    if (onOpenChat) {
      onOpenChat();
    }
    navigate(`/app/chat/${conversationId}`);
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 transition-colors hover:bg-primary/10">
      <div className="flex items-center gap-2">
        <div className="relative">
          <MessageCircle className="h-4 w-4 text-primary" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-foreground">
          Chat associado
        </span>
        {unreadCount > 0 && (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
            {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenChat}
        className="h-7 gap-1 text-primary hover:text-primary hover:bg-primary/10"
      >
        Abrir
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
}
