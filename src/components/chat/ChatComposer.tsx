import { useState, useRef, KeyboardEvent } from 'react';
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

interface ChatComposerProps {
  onSend: (body: string, attachments?: File[]) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
  autoFocus?: boolean;
}

const EMOJI_LIST = ['👍', '❤️', '🔥', '👏', '💯', '😊', '🎉', '✨', '👀', '🙌', '💪', '🚀'];

export function ChatComposer({
  onSend,
  placeholder = 'Escrever mensagem...',
  isLoading = false,
  autoFocus = false,
}: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    setMessage('');
    await onSend(trimmedMessage);

    // Refocus textarea after sending
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const canSend = message.trim().length > 0 && !isLoading;
  const charCount = message.length;

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
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
              >
                <AtSign className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mencionar</TooltipContent>
          </Tooltip>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
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
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
            Tarefa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
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
  );
}
