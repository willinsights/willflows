import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Check, 
  RotateCcw,
  Reply,
  Trash2,
  Clock,
  MessageSquare,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoComment, useVideoComments } from '@/hooks/useVideoComments';
import { formatTimecode } from '@/lib/duration-utils';

interface TimestampCommentsProps {
  videoVersionId: string;
  taskId: string;
  workspaceId: string;
  onSeekTo?: (timestampSeconds: number) => void;
  className?: string;
}

export function TimestampComments({
  videoVersionId,
  taskId,
  workspaceId,
  onSeekTo,
  className
}: TimestampCommentsProps) {
  const { 
    comments, 
    loading, 
    addComment,
    resolveComment, 
    reopenComment,
    deleteComment,
    openCount,
    resolvedCount
  } = useVideoComments(videoVersionId);
  
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const filteredComments = comments.filter(comment => {
    if (filter === 'open') return comment.status === 'open';
    if (filter === 'resolved') return comment.status === 'resolved';
    return true;
  });

  const handleReply = async (parentId: string, body: string) => {
    await addComment({
      videoVersionId,
      taskId,
      workspaceId,
      timestampSeconds: 0,
      body,
      parentId,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters only - title is in parent CardTitle */}
      <div className="flex items-center justify-end gap-1">
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
              onDelete={() => deleteComment(comment.id)}
              onReply={(body) => handleReply(comment.id, body)}
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
  onDelete: () => void;
  onReply: (body: string) => void;
}

function CommentCard({ comment, onSeekTo, onResolve, onReopen, onDelete, onReply }: CommentCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
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

  const handleSubmitReply = async () => {
    if (!replyText.trim() || submittingReply) return;
    
    setSubmittingReply(true);
    try {
      await onReply(replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    } finally {
      setSubmittingReply(false);
    }
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
            {formatTimecode(comment.timestamp_seconds)}
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
              {/* Reply button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="h-7 text-xs"
              >
                <Reply className="h-3 w-3 mr-1" />
                Responder
              </Button>

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
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-7 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDelete();
                      setShowDeleteConfirm(false);
                    }}
                    className="h-7 text-xs text-destructive hover:text-destructive"
                  >
                    Confirmar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Comment body */}
          <p className={cn("text-sm", isResolved && "text-muted-foreground line-through")}>
            {comment.body}
          </p>

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escrever resposta..."
                rows={2}
                className="text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmitReply();
                  }
                }}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim() || submittingReply}
                  className="h-8"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Enviar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyText('');
                  }}
                  className="h-8"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

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
