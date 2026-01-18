import { useState, useRef, KeyboardEvent, ChangeEvent, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Paperclip, Send, Smile, CheckSquare, Flag, Loader2, AtSign } from 'lucide-react';
import { MentionPopover, MentionMember } from './MentionPopover';
import { AttachmentPreview } from './AttachmentPreview';
import { CreateQuickTaskModal } from './CreateQuickTaskModal';
import { CreateQuickFollowUpModal } from './CreateQuickFollowUpModal';

interface ChatComposerProps {
  onSend: (body: string, attachments?: File[]) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
  autoFocus?: boolean;
  members?: MentionMember[];
  conversationId?: string;
  projectId?: string;
}

const EMOJI_LIST = ['👍', '❤️', '🔥', '👏', '💯', '😊', '🎉', '✨', '👀', '🙌', '💪', '🚀'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/*', 'application/pdf', 'video/*', 'audio/*', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];

export function ChatComposer({
  onSend,
  placeholder = 'Escrever mensagem...',
  isLoading = false,
  autoFocus = false,
  members = [],
  conversationId,
  projectId,
}: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate previews for image attachments
  useEffect(() => {
    const previews: string[] = [];
    attachments.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        previews.push(url);
      } else {
        previews.push('');
      }
    });
    setAttachmentPreviews(previews);

    return () => {
      previews.forEach((url) => url && URL.revokeObjectURL(url));
    };
  }, [attachments]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || isLoading) return;

    const filesToSend = [...attachments];
    setMessage('');
    setAttachments([]);
    await onSend(trimmedMessage, filesToSend.length > 0 ? filesToSend : undefined);

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mentions navigation
    if (showMentions) {
      const filteredMembers = members.filter((m) => {
        const searchTerm = mentionFilter.toLowerCase();
        const name = m.full_name?.toLowerCase() || '';
        const email = m.email?.toLowerCase() || '';
        return name.includes(searchTerm) || email.includes(searchTerm);
      });

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers[mentionSelectedIndex]) {
          selectMention(filteredMembers[mentionSelectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMentions();
        return;
      }
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setMessage(value);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show mentions if @ is at start or after whitespace, and no space after @
      const charBeforeAt = value[lastAtIndex - 1];
      if ((lastAtIndex === 0 || /\s/.test(charBeforeAt)) && !/\s/.test(textAfterAt)) {
        setShowMentions(true);
        setMentionFilter(textAfterAt);
        setMentionStartPos(lastAtIndex);
        setMentionSelectedIndex(0);
        return;
      }
    }
    
    closeMentions();
  };

  const closeMentions = () => {
    setShowMentions(false);
    setMentionFilter('');
    setMentionStartPos(null);
    setMentionSelectedIndex(0);
  };

  const selectMention = (member: MentionMember) => {
    if (mentionStartPos === null) return;
    
    const name = member.full_name || 'Utilizador';
    const beforeMention = message.slice(0, mentionStartPos);
    const cursorPos = textareaRef.current?.selectionStart || mentionStartPos;
    const afterMention = message.slice(cursorPos);
    
    const newMessage = `${beforeMention}@${name} ${afterMention}`;
    setMessage(newMessage);
    closeMentions();
    
    // Focus and set cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const triggerMention = () => {
    const cursorPos = textareaRef.current?.selectionStart || message.length;
    const beforeCursor = message.slice(0, cursorPos);
    const afterCursor = message.slice(cursorPos);
    
    // Add @ and show mentions
    const newMessage = beforeCursor + '@' + afterCursor;
    setMessage(newMessage);
    setMentionStartPos(cursorPos);
    setMentionFilter('');
    setShowMentions(true);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
      }
    }, 0);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    
    setAttachments((prev) => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !isLoading;
  const charCount = message.length;

  return (
    <>
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden relative">
        {/* Mention Popover */}
        {showMentions && members.length > 0 && (
          <div className="absolute bottom-full left-3 z-50">
            <MentionPopover
              members={members}
              filter={mentionFilter}
              onSelect={selectMention}
              onClose={closeMentions}
              selectedIndex={mentionSelectedIndex}
            />
          </div>
        )}

        {/* Attachment Preview */}
        <AttachmentPreview
          files={attachments}
          onRemove={removeAttachment}
          previews={attachmentPreviews}
        />

        {/* Main Input Area */}
        <div className="flex items-end gap-2 p-3">
          {/* Quick Actions */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Anexar ficheiro</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={triggerMention}
                >
                  <AtSign className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mencionar</TooltipContent>
            </Tooltip>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_FILE_TYPES.join(',')}
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus={autoFocus}
              rows={1}
              className={cn(
                'min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent',
                'focus-visible:ring-0 focus-visible:ring-offset-0',
                'placeholder:text-muted-foreground/50 text-sm'
              )}
              style={{
                height: 'auto',
                overflow: 'hidden',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
              }}
            />
          </div>

          {/* Emoji Picker */}
          <Popover open={showEmoji} onOpenChange={setShowEmoji}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Send Button */}
          <Button
            size="icon"
            className={cn(
              'h-8 w-8 rounded-lg transition-all',
              canSend 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'bg-muted text-muted-foreground'
            )}
            onClick={handleSend}
            disabled={!canSend}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Footer with quick actions and char count */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => conversationId && setShowTaskModal(true)}
              disabled={!conversationId}
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              Tarefa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => conversationId && setShowFollowUpModal(true)}
              disabled={!conversationId}
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              FollowUp
            </Button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {charCount > 0 && (
              <span className={cn(charCount > 2000 && 'text-destructive')}>
                {charCount}/2000
              </span>
            )}
            <span className="opacity-60">
              Enter para enviar • Shift+Enter nova linha
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {conversationId && (
        <>
          <CreateQuickTaskModal
            open={showTaskModal}
            onOpenChange={setShowTaskModal}
            conversationId={conversationId}
            projectId={projectId}
          />
          <CreateQuickFollowUpModal
            open={showFollowUpModal}
            onOpenChange={setShowFollowUpModal}
            conversationId={conversationId}
          />
        </>
      )}
    </>
  );
}
