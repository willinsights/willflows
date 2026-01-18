import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MessageSquare,
  MoreHorizontal,
  CheckSquare,
  Flag,
  ThumbsUp,
  Heart,
  Smile,
} from 'lucide-react';
import { CreateTaskFromMessageModal } from './CreateTaskFromMessageModal';
import { CreateFollowUpModal } from './CreateFollowUpModal';
import type { Message } from '@/hooks/useMessages';

interface ChatMessageProps {
  message: Message;
  onOpenThread?: () => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  threadCount?: number;
  isThreadReply?: boolean;
}

export function ChatMessage({
  message,
  onOpenThread,
  onToggleReaction,
  threadCount = 0,
  isThreadReply = false,
}: ChatMessageProps) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const userProfile = message.user;
  const initials =
    userProfile?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';

  const formattedTime = format(new Date(message.created_at || ''), 'HH:mm', {
    locale: pt,
  });

  const formattedDate = formatDistanceToNow(new Date(message.created_at || ''), {
    addSuffix: true,
    locale: pt,
  });

  const isSystemMessage = message.type === 'system';

  if (isSystemMessage) {
    return (
      <div className="flex justify-center py-3">
        <span className="text-xs text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full">
          {message.body}
        </span>
      </div>
    );
  }

  const handleReaction = (emoji: string) => {
    onToggleReaction?.(message.id, emoji);
  };

  return (
    <>
      <div
        className={cn(
          'group flex gap-3 py-2 px-3 -mx-3 rounded-xl transition-all duration-150',
          isHovered && 'bg-muted/40',
          isThreadReply && 'ml-8'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator - shown randomly for demo */}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">
              {userProfile?.full_name || 'Utilizador'}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-muted-foreground cursor-default">
                  {formattedTime}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {formattedDate}
              </TooltipContent>
            </Tooltip>
            {message.is_edited && (
              <span className="text-[10px] text-muted-foreground italic">(editado)</span>
            )}
          </div>

          {/* Body */}
          <div className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words leading-relaxed">
            {message.body}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all',
                    reaction.reacted_by_me
                      ? 'bg-primary/15 text-primary border border-primary/20'
                      : 'bg-muted hover:bg-muted/80 border border-transparent'
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span className={cn(
                    'font-medium',
                    reaction.reacted_by_me ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {reaction.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Thread indicator */}
          {!isThreadReply && threadCount > 0 && (
            <button
              onClick={onOpenThread}
              className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:text-primary/80 transition-colors group/thread"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="font-medium">
                {threadCount} {threadCount === 1 ? 'resposta' : 'respostas'}
              </span>
              <span className="text-muted-foreground group-hover/thread:text-primary/60">
                Ver thread
              </span>
            </button>
          )}
        </div>

        {/* Actions (on hover) */}
        <div
          className={cn(
            'flex items-start gap-0.5 transition-opacity duration-150',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Quick Reactions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                onClick={() => handleReaction('👍')}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Gostar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleReaction('❤️')}
              >
                <Heart className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Adorar</TooltipContent>
          </Tooltip>

          {/* Thread */}
          {!isThreadReply && onOpenThread && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-muted"
                  onClick={onOpenThread}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Responder em thread</TooltipContent>
            </Tooltip>
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowTaskModal(true)}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Criar Tarefa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFollowUpModal(true)}>
                <Flag className="h-4 w-4 mr-2" />
                Marcar FollowUp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleReaction('🔥')}>
                <span className="mr-2">🔥</span>
                Fogo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleReaction('👏')}>
                <span className="mr-2">👏</span>
                Aplausos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleReaction('💯')}>
                <span className="mr-2">💯</span>
                100%
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modals */}
      <CreateTaskFromMessageModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        message={message}
      />
      <CreateFollowUpModal
        open={showFollowUpModal}
        onOpenChange={setShowFollowUpModal}
        message={message}
      />
    </>
  );
}
