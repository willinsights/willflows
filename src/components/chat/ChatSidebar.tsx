import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Plus,
  Hash,
  FolderKanban,
  User,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CreateChannelModal } from './CreateChannelModal';

interface ChatSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ChatSidebar({
  activeConversationId,
  onSelectConversation,
}: ChatSidebarProps) {
  const { conversations, isLoading } = useConversations();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    projects: true,
    channels: true,
    dms: true,
  });

  const toggleSection = (section: 'projects' | 'channels' | 'dms') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter and group conversations
  const filteredConversations = conversations.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const projectChats = filteredConversations.filter((c) => c.type === 'project');
  const channels = filteredConversations.filter((c) => c.type === 'channel');
  const dms = filteredConversations.filter((c) => c.type === 'dm');

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-4">
          {/* Project Chats */}
          <Collapsible
            open={expandedSections.projects}
            onOpenChange={() => toggleSection('projects')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
              <span className="flex items-center gap-2">
                <FolderKanban className="h-3.5 w-3.5" />
                Projetos ({projectChats.length})
              </span>
              {expandedSections.projects ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 mt-1">
              {projectChats.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum projeto com chat
                </p>
              ) : (
                projectChats.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={activeConversationId === conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    icon={<FolderKanban className="h-4 w-4" />}
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
            <div className="flex items-center justify-between px-2">
              <CollapsibleTrigger className="flex items-center gap-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                <Hash className="h-3.5 w-3.5" />
                Canais ({channels.length})
                {expandedSections.channels ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowCreateChannel(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CollapsibleContent className="space-y-0.5 mt-1">
              {channels.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum canal criado
                </p>
              ) : (
                channels.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={activeConversationId === conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    icon={<Hash className="h-4 w-4" />}
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
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Mensagens Diretas ({dms.length})
              </span>
              {expandedSections.dms ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 mt-1">
              {dms.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhuma mensagem direta
                </p>
              ) : (
                dms.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={activeConversationId === conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    icon={<User className="h-4 w-4" />}
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
    </div>
  );
}

interface ConversationItemProps {
  conversation: {
    id: string;
    name: string | null;
    type: string;
    is_private?: boolean | null;
    unread_count?: number;
  };
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  icon,
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors',
        'hover:bg-muted/50',
        isActive && 'bg-primary/10 text-primary font-medium'
      )}
    >
      <span className={cn('text-muted-foreground', isActive && 'text-primary')}>
        {icon}
      </span>
      <span className="truncate flex-1 text-left">
        {conversation.name || 'Sem nome'}
      </span>
      {conversation.unread_count && conversation.unread_count > 0 && (
        <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
        </span>
      )}
    </button>
  );
}
