import { useState, useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Paperclip, Send, Smile, CheckSquare, Flag, Loader2 } from 'lucide-react';

interface ChatComposerProps {
  onSend: (body: string, attachments?: File[]) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
  autoFocus?: boolean;
}

export function ChatComposer({
  onSend,
  placeholder = 'Escrever mensagem...',
  isLoading = false,
  autoFocus = false,
}: ChatComposerProps) {
  const [message, setMessage] = useState('');
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

  const canSend = message.trim().length > 0 && !isLoading;

  return (
    <div className="glass-card p-3">
      <div className="flex items-end gap-2">
        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Anexar ficheiro</TooltipContent>
          </Tooltip>
        </div>

        {/* Text Input */}
        <div className="flex-1">
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
              'placeholder:text-muted-foreground/60'
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

        {/* Send Button */}
        <Button
          size="icon"
          className="h-8 w-8 rounded-full"
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

      {/* Quick Action Chips */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <CheckSquare className="h-3.5 w-3.5 mr-1" />
          Nova Tarefa
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Flag className="h-3.5 w-3.5 mr-1" />
          FollowUp
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-3.5 w-3.5 mr-1" />
          Emoji
        </Button>
      </div>
    </div>
  );
}
