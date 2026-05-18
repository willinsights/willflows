import { useConversations } from '@/hooks/useConversations';
import { useProjects } from '@/hooks/useProjects';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { X, Hash } from 'lucide-react';
import { ChannelContextPanel } from './context/ChannelContextPanel';
import { ProjectContextPanel } from './context/ProjectContextPanel';

interface ChatContextPanelProps {
  conversationId: string;
  onClose?: () => void;
}

/**
 * Orchestrator: dispatches to ChannelContextPanel (channel/DM)
 * or ProjectContextPanel (project chat).
 */
export function ChatContextPanel({ conversationId, onClose }: ChatContextPanelProps) {
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { loading: projectsLoading } = useProjects();

  if (conversationsLoading || projectsLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  const conversation = conversations.find((c) => c.id === conversationId);

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <Hash className="h-12 w-12 mb-3 opacity-30" />
        <p className="font-medium">Conversa não encontrada</p>
      </div>
    );
  }

  if (conversation.type === 'project') {
    return <ProjectContextPanel conversationId={conversationId} onClose={onClose} />;
  }

  return <ChannelContextPanel conversationId={conversationId} onClose={onClose} />;
}
