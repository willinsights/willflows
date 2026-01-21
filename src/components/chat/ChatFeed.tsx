import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMessages } from '@/hooks/useMessages';
import { useConversations, useConversation } from '@/hooks/useConversations';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { usePresence } from '@/hooks/usePresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { ChatThread } from './ChatThread';
import { DeleteConversationModal } from './DeleteConversationModal';
import { TypingIndicator } from './TypingIndicator';
import { MessageReplyPreview } from './MessageReplyPreview';
import { MessageSearchBar } from './MessageSearchBar';
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
import { Hash, FolderKanban, User, Users, MessageCircle, ArrowDown, MoreHorizontal, Trash2, Search } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';

interface ChatFeedProps {
  conversationId: string;
}

export function ChatFeed({ conversationId }: ChatFeedProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const { messages, isLoading, sendMessage, updateMessage, toggleReaction, markAsRead, replyingTo, setReplyingTo } = useMessages(conversationId);
  const { conversations, leaveConversation } = useConversations();
  const { members: conversationMembers } = useConversation(conversationId);
  const { members: workspaceMembers, loading: membersLoading } = useWorkspaceMembers();
  const { isOnline, onlineCount } = usePresence();
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(conversationId);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === conversationId);

  // Fetch current user profile for typing indicator
  const { data: userProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });
  
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
      .filter((m) => m.user_id)
      .map((m) => ({
        id: m.user_id,
        user_id: m.user_id,
        full_name: m.full_name || null,
        avatar_url: m.avatar_url || null,
        email: m.email,
      }));
  }, [workspaceMembers]);

  // Mark conversation as read when opened (using last message timestamp to avoid clock skew)
  // Uses upsert to ensure membership exists (important for public channels)
  useEffect(() => {
    if (!conversationId || !user?.id || !workspace?.id) return;
    // Wait for messages to load before marking as read
    if (isLoading) return;
    
    const markConversationAsRead = async () => {
      // Use last message timestamp instead of client time to avoid clock skew issues
      const lastMessageAt = messages.length > 0 ? messages[messages.length - 1]?.created_at : null;
      const readTimestamp = lastMessageAt || new Date().toISOString();
      
      logger.debug('markConversationAsRead:', { conversationId, userId: user.id, readTimestamp, messageCount: messages.length });
      
      // Upsert membership to ensure it exists (for public channels user may not have membership yet)
      const { error: upsertError } = await supabase
        .from('conversation_members')
        .upsert(
          { 
            conversation_id: conversationId, 
            user_id: user.id, 
            role: 'member',
            last_read_at: readTimestamp 
          },
          { 
            onConflict: 'conversation_id,user_id',
            ignoreDuplicates: false 
          }
        );
      
      if (upsertError) {
        logger.error('Failed to upsert conversation membership:', upsertError.code, upsertError.message);
        return;
      }
      
      logger.debug('markConversationAsRead: upsert successful');
      
      // Cancel any pending queries to prevent stale data from overwriting
      await queryClient.cancelQueries({ queryKey: ['conversations', workspace.id] });
      
      // Optimistic update: immediately set unread_count to 0 in cache
      queryClient.setQueryData(
        ['conversations', workspace.id],
        (oldData: typeof conversations | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(conv => 
            conv.id === conversationId 
              ? { ...conv, unread_count: 0 }
              : conv
          );
        }
      );
      
      // Also invalidate to ensure consistency with backend
      queryClient.invalidateQueries({ queryKey: ['conversations', workspace.id] });
    };
    
    markConversationAsRead();
  }, [conversationId, user?.id, workspace?.id, messages, isLoading, queryClient]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // Use setTimeout to ensure DOM is fully rendered, then scroll to anchor
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }, 100);
    }
  }, [messages.length, conversationId]);

  // Check scroll position for FAB
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
    const replyTo = replyingTo ? {
      id: replyingTo.id,
      body: replyingTo.body.slice(0, 150),
      user_name: replyingTo.user?.full_name || replyingTo.user?.email?.split('@')[0] || 'Participante'
    } : undefined;
    
    stopTyping();
    await sendMessage.mutateAsync({ body, attachments, mentionedUserIds, replyTo });
  };

  const handleReply = (message: typeof messages[0]) => {
    setReplyingTo(message);
  };

  const handleOpenThread = (messageId: string) => {
    setActiveThreadId(messageId);
  };

  // Scroll to a specific message (for search results)
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight briefly
      messageElement.classList.add('bg-primary/10');
      setTimeout(() => {
        messageElement.classList.remove('bg-primary/10');
      }, 2000);
    }
  };
  // Mark messages as read when they come into view
  useEffect(() => {
    if (!user?.id || messages.length === 0) return;
    
    // Mark the last few messages as read
    const unreadMessages = messages
      .filter(m => m.user_id !== user.id && (!m.read_by || !m.read_by.some(r => r.user_id === user.id)))
      .slice(-5);
    
    unreadMessages.forEach(m => markAsRead(m.id));
  }, [messages, user?.id, markAsRead]);

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

        {/* Search Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setShowSearchBar(!showSearchBar)}
        >
          <Search className="h-4 w-4" />
        </Button>
        
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

      {/* Search Bar */}
      {showSearchBar && (
        <MessageSearchBar
          conversationId={conversationId}
          onResultClick={scrollToMessage}
          onClose={() => setShowSearchBar(false)}
        />
      )}

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
                      <div key={message.id} id={`message-${message.id}`} className="transition-colors duration-500">
                        <ChatMessage
                          message={message}
                          onOpenThread={() => handleOpenThread(message.id)}
                          onToggleReaction={toggleReaction}
                          onEditMessage={async (id, body) => {
                            await updateMessage.mutateAsync({ messageId: id, body });
                          }}
                          onReply={handleReply}
                          threadCount={
                            messages.filter((m) => m.parent_message_id === message.id).length
                          }
                          isOnline={isOnline(message.user_id)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
                {/* Scroll anchor at the end of messages */}
                <div ref={messagesEndRef} />
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

          {/* Composer Area */}
          <div className="border-t border-border/30 p-4 space-y-2">
            {/* Reply Preview */}
            {replyingTo && (
              <MessageReplyPreview 
                replyTo={{
                  id: replyingTo.id,
                  body: replyingTo.body.slice(0, 150),
                  user_name: replyingTo.user?.full_name || replyingTo.user?.email?.split('@')[0] || 'Participante'
                }}
                onClear={() => setReplyingTo(null)}
              />
            )}
            
            {/* Typing Indicator */}
            <TypingIndicator typingUsers={typingUsers} />
            
            <ChatComposer
              onSend={handleSendMessage}
              placeholder={`Mensagem para ${conversation?.displayName || conversation?.name || 'conversa'}...`}
              isLoading={sendMessage.isPending}
              members={conversation?.type === 'dm' ? [] : mentionMembers}
              showMentionButton={conversation?.type !== 'dm'}
              conversationId={conversationId}
              projectId={conversation?.project_id || undefined}
              onTyping={() => startTyping(userProfile?.full_name)}
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
