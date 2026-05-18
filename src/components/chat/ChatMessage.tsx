import { memo, useState, useEffect } from 'react';
import { linkifyText } from '@/lib/linkify';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  Pencil,
  X,
  Check,
  CheckCheck,
  Reply,
} from 'lucide-react';
import { CreateTaskFromMessageModal } from './CreateTaskFromMessageModal';
import { CreateFollowUpModal } from './CreateFollowUpModal';
import { MessageAttachments } from './MessageAttachments';
import { MessageReplyPreview } from './MessageReplyPreview';
import { ReactionUsersPopover } from './ReactionUsersPopover';
import type { Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';

const EDIT_WINDOW_SECONDS = 15;

interface ChatMessageProps {
  message: Message;
  onOpenThread?: () => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, body: string) => Promise<void>;
  onReply?: (message: Message) => void;
  threadCount?: number;
  isThreadReply?: boolean;
  isOnline?: boolean;
}

export function ChatMessage({
  message,
  onOpenThread,
  onToggleReaction,
  onEditMessage,
  onReply,
  threadCount = 0,
  isThreadReply = false,
  isOnline = false,
}: ChatMessageProps) {
  const { user: currentUser } = useAuth();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(message.body);
  const [isSaving, setIsSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Calculate if user can edit (owner + within 15 seconds + not already edited)
  const isOwner = message.user_id === currentUser?.id;
  
  useEffect(() => {
    if (!isOwner || message.is_edited) {
      setCanEdit(false);
      return;
    }
    
    const checkEditWindow = () => {
      const createdAt = new Date(message.created_at);
      const secondsAgo = (Date.now() - createdAt.getTime()) / 1000;
      setCanEdit(secondsAgo <= EDIT_WINDOW_SECONDS);
    };
    
    checkEditWindow();
    const interval = setInterval(checkEditWindow, 1000);
    return () => clearInterval(interval);
  }, [isOwner, message.is_edited, message.created_at]);

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
  
  // Check if message was read (for owner's messages)
  const hasBeenRead = isOwner && message.read_by && message.read_by.length > 0;

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

  const handleSaveEdit = async () => {
    if (!onEditMessage || editedBody.trim() === message.body) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await onEditMessage(message.id, editedBody.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedBody(message.body);
    setIsEditing(false);
  };

  return (
    <>
      <div
        className={cn(
          'group flex gap-3 py-2.5 px-3 -mx-3 rounded-xl',
          'transition-all duration-200',
          'hover:bg-muted/30 hover:shadow-sm',
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
          {/* Online indicator - shows real presence status */}
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">
              {userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Participante'}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-muted-foreground cursor-default flex items-center gap-1">
                  {formattedTime}
                  {/* Read receipt - only for owner's messages */}
                  {isOwner && (
                    hasBeenRead ? (
                      <CheckCheck className="h-3 w-3 text-primary" />
                    ) : (
                      <Check className="h-3 w-3 text-muted-foreground" />
                    )
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {formattedDate}
                {isOwner && hasBeenRead && (
                  <span className="block text-primary">Lida</span>
                )}
              </TooltipContent>
            </Tooltip>
            {message.is_edited && (
              <span className="text-[10px] text-muted-foreground italic">(editado)</span>
            )}
          </div>

          {/* Reply Preview - if message is a reply to another */}
          {message.reply_to && !isEditing && (
            <MessageReplyPreview replyTo={message.reply_to} compact />
          )}

          {/* Body - Editable or Static */}
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSaveEdit}
                  disabled={isSaving || editedBody.trim() === message.body}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words leading-relaxed">
              {linkifyText(message.body)}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && !isEditing && (
            <MessageAttachments attachments={message.attachments} />
          )}

          {/* Reactions with user list popover */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {message.reactions.map((reaction) => (
                <ReactionUsersPopover
                  key={reaction.emoji}
                  emoji={reaction.emoji}
                  userIds={reaction.users}
                  count={reaction.count}
                  reactedByMe={reaction.reacted_by_me}
                  onToggle={() => handleReaction(reaction.emoji)}
                />
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

          {/* Reply - Inline reply */}
          {onReply && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-muted"
                  onClick={() => onReply(message)}
                >
                  <Reply className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Responder</TooltipContent>
            </Tooltip>
          )}

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
              {/* Edit option - only if can edit */}
              {canEdit && onEditMessage && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar (15s)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
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
