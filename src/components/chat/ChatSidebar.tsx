import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Search,
  Plus,
  Hash,
  FolderKanban,
  User,
  ChevronDown,
  ChevronRight,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateChannelModal } from './CreateChannelModal';
import { CreateDMModal } from './CreateDMModal';
import { DeleteConversationModal } from './DeleteConversationModal';
import type { Conversation } from '@/hooks/useConversations';

interface ChatSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ChatSidebar({
  activeConversationId,
  onSelectConversation,
}: ChatSidebarProps) {
  const navigate = useNavigate();
  const { conversations, isLoading, leaveConversation } = useConversations();
  const { isAdmin } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDM, setShowCreateDM] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    projects: true,
    channels: true,
    dms: true,
  });

  const toggleSection = (section: 'projects' | 'channels' | 'dms') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDeleteConversation = () => {
    if (!conversationToDelete) return;
    
    leaveConversation.mutate(conversationToDelete.id, {
      onSuccess: () => {
        // If we deleted the active conversation, navigate away
        if (activeConversationId === conversationToDelete.id) {
          navigate('/app/chat');
        }
        setConversationToDelete(null);
      },
      onError: () => {
        setConversationToDelete(null);
      },
    });
  };

  // Filter and group conversations
  const filteredConversations = conversations.filter((c) =>
    (c.displayName || c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const projectChats = filteredConversations.filter((c) => c.type === 'project');
  const channels = filteredConversations.filter((c) => c.type === 'channel');
  const dms = filteredConversations.filter((c) => c.type === 'dm');

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Search */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="py-2 space-y-1">
          {/* Project Chats */}
          <Collapsible
            open={expandedSections.projects}
            onOpenChange={() => toggleSection('projects')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <span className="flex items-center gap-2">
                <FolderKanban className="h-3.5 w-3.5" />
                Projetos
                <span className="text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded-full">
                  {projectChats.length}
                </span>
              </span>
              {expandedSections.projects ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {projectChats.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Nenhum projeto com chat
                </p>
              ) : (
                projectChats.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={activeConversationId === conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    onDelete={() => setConversationToDelete(conversation)}
                    showDeleteOption
                  />
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Channels */}
          <Collapsible
            open={expandedSections.channels}
            onOpenChange={() => toggleSection('channels')}
          >
            <div className="flex items-center justify-between px-4 py-2">
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <Hash className="h-3.5 w-3.5" />
                Canais
                <span className="text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded-full">
                  {channels.length}
                </span>
                {expandedSections.channels ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </CollapsibleTrigger>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                  onClick={() => setShowCreateChannel(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <CollapsibleContent className="space-y-0.5">
              {channels.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhum canal criado
                  </p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateChannel(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Canal
                    </Button>
                  )}
                </div>
              ) : (
                channels.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={activeConversationId === conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                  />
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Direct Messages */}
          <Collapsible
            open={expandedSections.dms}
            onOpenChange={() => toggleSection('dms')}
          >
            <div className="flex items-center justify-between px-4 py-2">
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <User className="h-3.5 w-3.5" />
                Mensagens
                <span className="text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded-full">
                  {dms.length}
                </span>
                {expandedSections.dms ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                onClick={() => setShowCreateDM(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CollapsibleContent className="space-y-0.5">
              {dms.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhuma mensagem
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateDM(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Iniciar Conversa
                  </Button>
                </div>
              ) : (
                dms.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={activeConversationId === conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    onDelete={() => setConversationToDelete(conversation)}
                    showDeleteOption
                  />
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      <CreateChannelModal
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
      />

      <CreateDMModal
        open={showCreateDM}
        onOpenChange={setShowCreateDM}
      />

      <DeleteConversationModal
        open={!!conversationToDelete}
        onOpenChange={(open) => !open && setConversationToDelete(null)}
        onConfirm={handleDeleteConversation}
        isLoading={leaveConversation.isPending}
        conversationName={conversationToDelete?.displayName || conversationToDelete?.dmParticipant?.full_name || undefined}
      />
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  showDeleteOption?: boolean;
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
  showDeleteOption,
}: ConversationItemProps) {
  // Para DMs usar nome do participante, para projetos usar nome do projeto
  const displayName = conversation.displayName 
    || conversation.dmParticipant?.full_name 
    || conversation.dmParticipant?.email?.split('@')[0]
    || conversation.name 
    || 'Utilizador';
  const lastMessage = conversation.lastMessage;
  
  const getIcon = () => {
    switch (conversation.type) {
      case 'project':
        return (
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <FolderKanban className="h-4 w-4 text-primary" />
          </div>
        );
      case 'channel':
        return (
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {conversation.is_private ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Hash className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        );
      case 'dm':
        return (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={conversation.dmParticipant?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer',
        'hover:bg-muted/60',
        isActive && 'bg-primary/10 hover:bg-primary/15'
      )}
      onClick={onClick}
    >
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'font-medium text-sm truncate',
            isActive && 'text-primary'
          )}>
            {displayName}
          </span>
          {lastMessage && !showDeleteOption && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(lastMessage.created_at), {
                addSuffix: false,
                locale: pt,
              })}
            </span>
          )}
        </div>
        
        {lastMessage && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            <span className="font-medium">{lastMessage.user_name}:</span>{' '}
            {lastMessage.body.length > 40 
              ? lastMessage.body.slice(0, 40) + '...' 
              : lastMessage.body}
          </p>
        )}
      </div>

      {conversation.unread_count && conversation.unread_count > 0 && (
        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
        </span>
      )}

      {showDeleteOption && onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
