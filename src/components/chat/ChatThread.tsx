import { useEffect, useRef } from 'react';
import { useMessages, useThreadMessages } from '@/hooks/useMessages';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, MessageSquare } from 'lucide-react';

interface ChatThreadProps {
  parentMessageId: string;
  conversationId: string;
  onClose: () => void;
}

export function ChatThread({
  parentMessageId,
  conversationId,
  onClose,
}: ChatThreadProps) {
  const { messages: allMessages, sendMessage } = useMessages(conversationId);
  const { messages: threadReplies, isLoading } = useThreadMessages(parentMessageId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find parent message from main messages list
  const parentMessage = allMessages.find((m) => m.id === parentMessageId);

  // Auto-scroll to bottom on new replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadReplies.length]);

  const handleSendReply = async (body: string) => {
    await sendMessage.mutateAsync({
      body,
      parentMessageId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Thread</span>
          <span className="text-xs text-muted-foreground">
            {threadReplies.length}{' '}
            {threadReplies.length === 1 ? 'resposta' : 'respostas'}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Thread Content */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
        {/* Original Message */}
        {parentMessage && (
          <div className="pb-3 mb-3 border-b border-border">
            <ChatMessage message={parentMessage} isThreadReply={false} />
          </div>
        )}

        {/* Thread Replies */}
        <div className="space-y-3">
          {threadReplies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma resposta ainda
            </p>
          ) : (
            threadReplies.map((reply) => (
              <ChatMessage key={reply.id} message={reply} isThreadReply={true} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply Composer */}
      <div className="border-t border-border p-3">
        <ChatComposer
          onSend={handleSendReply}
          placeholder="Responder na thread..."
          isLoading={sendMessage.isPending}
          autoFocus
        />
      </div>
    </div>
  );
}
