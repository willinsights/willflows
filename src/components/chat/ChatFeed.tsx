import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '@/hooks/useMessages';
import { useConversations, useConversation } from '@/hooks/useConversations';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { usePresence } from '@/hooks/usePresence';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { ChatThread } from './ChatThread';
import { DeleteConversationModal } from './DeleteConversationModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Hash, FolderKanban, User, Users, MessageCircle, ArrowDown, MoreHorizontal, Trash2 } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';

interface ChatFeedProps {
  conversationId: string;
}

export function ChatFeed({ conversationId }: ChatFeedProps) {
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, toggleReaction } = useMessages(conversationId);
  const { conversations, leaveConversation } = useConversations();
  const { members: conversationMembers } = useConversation(conversationId);
  const { members: workspaceMembers, loading: membersLoading } = useWorkspaceMembers();
  const { isOnline, onlineCount } = usePresence();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  
  // Only projects and DMs can be deleted/left
  const canDelete = conversation?.type === 'project' || conversation?.type === 'dm';

  // Handle delete conversation
  const handleDeleteConversation = () => {
    if (!conversation) return;
    leaveConversation.mutate(conversation.id, {
      onSuccess: () => {
        toast.success('Conversa removida');
        navigate('/app/chat');
        setShowDeleteModal(false);
      },
      onError: () => {
        toast.error('Erro ao remover conversa');
      }
    });
  };

  // Map workspace members to mention format - filter out members without user_id
  const mentionMembers = useMemo(() => {
    return workspaceMembers
      .filter((m) => m.user_id) // Filter out members without user_id
      .map((m) => ({
        id: m.user_id,
        user_id: m.user_id,
        full_name: m.full_name || null,
        avatar_url: m.avatar_url || null,
        email: m.email,
      }));
  }, [workspaceMembers]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check scroll position for FAB
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const getConversationIcon = () => {
    switch (conversation?.type) {
      case 'project':
        return (
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
        );
      case 'channel':
        return (
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <Hash className="h-5 w-5 text-muted-foreground" />
          </div>
        );
      case 'dm':
        return (
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation?.dmParticipant?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {(conversation?.displayName || 'U').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <Hash className="h-5 w-5 text-muted-foreground" />
          </div>
        );
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: typeof messages }[] = [];
    let currentGroup: typeof messages = [];
    let currentDate: Date | null = null;

    messages.forEach(msg => {
      const msgDate = parseISO(msg.created_at);
      if (!currentDate || !isSameDay(currentDate, msgDate)) {
        if (currentGroup.length > 0 && currentDate) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [messages]);

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "d 'de' MMMM", { locale: pt });
  };

  const handleSendMessage = async (body: string, attachments?: File[], mentionedUserIds?: string[]) => {
    await sendMessage.mutateAsync({ body, attachments, mentionedUserIds });
  };

  const handleOpenThread = (messageId: string) => {
    setActiveThreadId(messageId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="border-b border-border px-4 py-3 bg-card">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-14 w-full max-w-md rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card">
        {getConversationIcon()}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">
            {conversation?.displayName || conversation?.name || 'Conversa'}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {conversationMembers.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {conversationMembers.length} {conversationMembers.length === 1 ? 'membro' : 'membros'}
              </span>
            )}
            <Badge variant="outline" className="h-5 text-[10px] border-success/30 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success mr-1 animate-pulse" />
              Em tempo real
            </Badge>
          </div>
        </div>
        
        {/* Options Menu */}
        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowDeleteModal(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConversationModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleDeleteConversation}
        isLoading={leaveConversation.isPending}
        conversationName={conversation?.displayName || conversation?.name}
      />

      {/* Messages Container with optional Thread */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Feed */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea
            ref={scrollRef}
            className="flex-1 px-4"
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium mb-1">Nenhuma mensagem ainda</p>
                <p className="text-sm">Sê o primeiro a enviar uma mensagem!</p>
              </div>
            ) : (
              <div className="py-4 space-y-1">
                {groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Date Separator */}
                    <div className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-medium text-muted-foreground bg-background px-2">
                        {formatDateSeparator(group.date)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    
                    {/* Messages */}
                    {group.messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        onOpenThread={() => handleOpenThread(message.id)}
                        onToggleReaction={toggleReaction}
                        threadCount={
                          messages.filter((m) => m.parent_message_id === message.id).length
                        }
                        isOnline={isOnline(message.user_id)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Scroll to bottom FAB */}
          {showScrollButton && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-24 right-6 h-9 w-9 rounded-full shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}

          {/* Composer */}
          <div className="border-t border-border p-4 bg-card">
            <ChatComposer
              onSend={handleSendMessage}
              placeholder={`Mensagem para ${conversation?.displayName || conversation?.name || 'conversa'}...`}
              isLoading={sendMessage.isPending}
              members={mentionMembers}
              conversationId={conversationId}
              projectId={conversation?.project_id || undefined}
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
