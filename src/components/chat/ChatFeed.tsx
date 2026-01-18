import { useEffect, useRef, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useConversations } from '@/hooks/useConversations';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { ChatThread } from './ChatThread';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Hash, FolderKanban, User } from 'lucide-react';

interface ChatFeedProps {
  conversationId: string;
}

export function ChatFeed({ conversationId }: ChatFeedProps) {
  const { messages, isLoading, sendMessage } = useMessages(conversationId);
  const { conversations } = useConversations();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === conversationId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getConversationIcon = () => {
    switch (conversation?.type) {
      case 'project':
        return <FolderKanban className="h-5 w-5" />;
      case 'channel':
        return <Hash className="h-5 w-5" />;
      case 'dm':
        return <User className="h-5 w-5" />;
      default:
        return <Hash className="h-5 w-5" />;
    }
  };

  // Filter root messages (not thread replies)
  const rootMessages = messages.filter((m) => !m.parent_message_id);

  const handleSendMessage = async (body: string, attachments?: File[]) => {
    await sendMessage.mutateAsync({ body });
  };

  const handleOpenThread = (messageId: string) => {
    setActiveThreadId(messageId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card">
        <span className="text-muted-foreground">{getConversationIcon()}</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">
            {conversation?.name || 'Conversa'}
          </h2>
          <span className="text-xs text-success flex items-center gap-1">
            Em tempo real
          </span>
        </div>
      </div>

      {/* Messages Container with optional Thread */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Feed */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea
            ref={scrollRef}
            className="flex-1 px-4 py-4"
          >
            {rootMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-lg mb-2">Nenhuma mensagem ainda</p>
                <p className="text-sm">Sê o primeiro a enviar uma mensagem!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rootMessages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onOpenThread={() => handleOpenThread(message.id)}
                    threadCount={
                      messages.filter((m) => m.parent_message_id === message.id)
                        .length
                    }
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Composer */}
          <div className="border-t border-border p-4">
            <ChatComposer
              onSend={handleSendMessage}
              placeholder={`Mensagem para ${conversation?.name || 'conversa'}...`}
              isLoading={sendMessage.isPending}
            />
          </div>
        </div>

        {/* Thread Panel */}
        {activeThreadId && (
          <div className="w-80 border-l border-border bg-card">
            <ChatThread
              parentMessageId={activeThreadId}
              conversationId={conversationId}
              onClose={() => setActiveThreadId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
