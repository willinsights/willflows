import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { formatDuration } from '@/lib/duration-utils';

interface CommentInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timestampSeconds: number;
  onSubmit: (body: string) => Promise<void>;
}

export function CommentInputModal({
  open,
  onOpenChange,
  timestampSeconds,
  onSubmit,
}: CommentInputModalProps) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody('');
      onOpenChange(false);
    } catch (error) {
      // Error toast handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar comentário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timestamp display */}
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Timestamp: {formatDuration(timestampSeconds)}
            </span>
          </div>

          {/* Comment input */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentário</Label>
            <Textarea
              id="comment"
              placeholder="Escreva o seu comentário..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!body.trim() || submitting}>
            {submitting ? 'A adicionar...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
