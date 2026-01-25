import { memo } from 'react';
import { MessageCircle } from 'lucide-react';
import { useProjectChatStatus } from '@/hooks/useProjectChatStatus';
import { cn } from '@/lib/utils';

interface KanbanChatIndicatorProps {
  projectId: string;
}

function KanbanChatIndicatorComponent({ projectId }: KanbanChatIndicatorProps) {
  const { hasChat, unreadCount } = useProjectChatStatus(projectId);

  if (!hasChat || unreadCount === 0) return null;

  return (
    <div className="relative flex items-center">
      <MessageCircle className="h-3 w-3 text-primary" />
      <span
        className={cn(
          'absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center',
          'rounded-full bg-destructive text-[7px] font-bold text-destructive-foreground'
        )}
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </div>
  );
}

export const KanbanChatIndicator = memo(KanbanChatIndicatorComponent);
