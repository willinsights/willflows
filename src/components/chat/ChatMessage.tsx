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
  CheckCircle,
  Smile,
} from 'lucide-react';
import { CreateTaskFromMessageModal } from './CreateTaskFromMessageModal';
import { CreateFollowUpModal } from './CreateFollowUpModal';
import type { Message } from '@/hooks/useMessages';

interface ChatMessageProps {
  message: Message;
  onOpenThread?: () => void;
  threadCount?: number;
  isThreadReply?: boolean;
}

export function ChatMessage({
  message,
  onOpenThread,
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
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.body}
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'group flex gap-3 py-1 px-2 -mx-2 rounded-lg transition-colors',
          isHovered && 'bg-muted/30',
          isThreadReply && 'ml-6'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar */}
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={userProfile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-sm">
              {userProfile?.full_name || 'Utilizador'}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-default">
                  {formattedTime}
                </span>
              </TooltipTrigger>
              <TooltipContent>{formattedDate}</TooltipContent>
            </Tooltip>
            {message.is_edited && (
              <span className="text-xs text-muted-foreground">(editado)</span>
            )}
          </div>

          {/* Body */}
          <div className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
            {message.body}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(
                message.reactions.reduce(
                  (acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>
                )
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors"
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thread indicator */}
          {!isThreadReply && threadCount > 0 && (
            <button
              onClick={onOpenThread}
              className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {threadCount} {threadCount === 1 ? 'resposta' : 'respostas'}
            </button>
          )}

        </div>

        {/* Actions (on hover) */}
        <div
          className={cn(
            'flex items-start gap-0.5 opacity-0 transition-opacity',
            isHovered && 'opacity-100'
          )}
        >
          {/* Quick Reactions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gostar</TooltipContent>
          </Tooltip>

          {/* Thread */}
          {!isThreadReply && onOpenThread && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onOpenThread}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Responder em thread</TooltipContent>
            </Tooltip>
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
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
              <DropdownMenuItem>
                <Smile className="h-4 w-4 mr-2" />
                Adicionar reação
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
