import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Check, 
  RotateCcw,
  Reply,
  Trash2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoComment, useVideoComments } from '@/hooks/useVideoComments';
import { formatDuration } from '@/lib/duration-utils';

interface TimestampCommentsProps {
  videoVersionId: string;
  projectId: string;
  workspaceId: string;
  onSeekTo?: (timestampSeconds: number) => void;
  className?: string;
}

export function TimestampComments({
  videoVersionId,
  projectId,
  workspaceId,
  onSeekTo,
  className
}: TimestampCommentsProps) {
  const { 
    comments, 
    loading, 
    resolveComment, 
    reopenComment,
    openCount,
    resolvedCount
  } = useVideoComments(videoVersionId);
  
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const filteredComments = comments.filter(comment => {
    if (filter === 'open') return comment.status === 'open';
    if (filter === 'resolved') return comment.status === 'resolved';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Comentários</span>
          <Badge variant="secondary" className="text-xs">
            {comments.length}
          </Badge>
        </div>

        <div className="flex gap-1">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'open' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('open')}
            className="gap-1"
          >
            <span className="h-2 w-2 rounded-full bg-warning" />
            {openCount}
          </Button>
          <Button
            variant={filter === 'resolved' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('resolved')}
            className="gap-1"
          >
            <Check className="h-3 w-3 text-green-500" />
            {resolvedCount}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {filteredComments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Sem comentários {filter !== 'all' ? `(${filter})` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onSeekTo={onSeekTo}
              onResolve={() => resolveComment(comment.id)}
              onReopen={() => reopenComment(comment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentCardProps {
  comment: VideoComment;
  onSeekTo?: (timestampSeconds: number) => void;
  onResolve: () => void;
  onReopen: () => void;
}

function CommentCard({ comment, onSeekTo, onResolve, onReopen }: CommentCardProps) {
  const isResolved = comment.status === 'resolved';

  const getInitials = () => {
    if (comment.is_client_comment && comment.client_name) {
      return comment.client_name.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getName = () => {
    if (comment.is_client_comment && comment.client_name) {
      return comment.client_name;
    }
    return 'Membro da equipa';
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-colors",
      isResolved ? "bg-muted/30 border-muted" : "bg-card"
    )}>
      <div className="flex gap-3">
        {/* Timestamp button */}
        <button
          onClick={() => onSeekTo?.(comment.timestamp_seconds)}
          className="flex-shrink-0 group"
        >
          <div className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-mono text-primary group-hover:bg-primary/20">
            <Clock className="h-3 w-3" />
            {formatDuration(comment.timestamp_seconds)}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          {/* Author and status */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{getName()}</span>
              {comment.is_client_comment && (
                <Badge variant="outline" className="text-xs">Cliente</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {isResolved ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReopen}
                  className="h-7 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reabrir
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onResolve}
                  className="h-7 text-xs text-green-600 hover:text-green-700"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Resolver
                </Button>
              )}
            </div>
          </div>

          {/* Comment body */}
          <p className={cn("text-sm", isResolved && "text-muted-foreground line-through")}>
            {comment.body}
          </p>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 pl-3 border-l-2 border-muted space-y-2">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <span className="font-medium">
                    {reply.is_client_comment ? reply.client_name : 'Equipa'}:
                  </span>{' '}
                  <span className="text-muted-foreground">{reply.body}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
