import { Reply, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageReplyPreviewProps {
  replyTo: { 
    id: string; 
    body: string; 
    user_name: string;
  };
  onClear?: () => void;
  compact?: boolean;
}

export function MessageReplyPreview({ replyTo, onClear, compact }: MessageReplyPreviewProps) {
  return (
    <div className={cn(
      "flex items-start gap-2 px-3 py-2 rounded-lg border-l-2 border-primary bg-muted/50",
      compact && "text-xs py-1.5"
    )}>
      <Reply className={cn("text-primary shrink-0 mt-0.5", compact ? "h-3 w-3" : "h-4 w-4")} />
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-primary", compact ? "text-[10px]" : "text-xs")}>
          {replyTo.user_name}
        </p>
        <p className={cn("text-muted-foreground truncate", compact ? "text-[11px]" : "text-sm")}>
          {replyTo.body}
        </p>
      </div>
      {onClear && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5 shrink-0" 
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
