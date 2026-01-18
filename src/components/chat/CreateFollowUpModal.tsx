import { useState } from 'react';
import { useFollowups } from '@/hooks/useFollowups';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Flag, Quote } from 'lucide-react';
import type { Message } from '@/hooks/useMessages';
import { addDays, format } from 'date-fns';

interface CreateFollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message;
}

export function CreateFollowUpModal({
  open,
  onOpenChange,
  message,
}: CreateFollowUpModalProps) {
  const { user } = useAuth();
  const { createFollowup } = useFollowups();
  const { members } = useWorkspaceMembers();

  const [assignTo, setAssignTo] = useState<'me' | 'other'>('me');
  const [assigneeId, setAssigneeId] = useState('');
  const [duePreset, setDuePreset] = useState<'today' | 'tomorrow' | 'week' | 'custom'>(
    'tomorrow'
  );
  const [customDate, setCustomDate] = useState('');
  const [note, setNote] = useState('');

  const getDueDate = () => {
    const today = new Date();
    switch (duePreset) {
      case 'today':
        return format(today, 'yyyy-MM-dd');
      case 'tomorrow':
        return format(addDays(today, 1), 'yyyy-MM-dd');
      case 'week':
        return format(addDays(today, 7), 'yyyy-MM-dd');
      case 'custom':
        return customDate;
      default:
        return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetUserId = assignTo === 'me' ? user?.id : assigneeId;
    if (!targetUserId) return;

    await createFollowup.mutateAsync({
      messageId: message.id,
      assignedTo: targetUserId,
      dueAt: getDueDate(),
      note: note.trim() || undefined,
    });

    onOpenChange(false);
  };

  const handleClose = () => {
    setAssignTo('me');
    setAssigneeId('');
    setDuePreset('tomorrow');
    setCustomDate('');
    setNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-warning" />
            Criar FollowUp
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Original Message Preview */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-2">
              <Quote className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground line-clamp-3">
                {message.body}
              </p>
            </div>
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <Label>Atribuir a</Label>
            <RadioGroup
              value={assignTo}
              onValueChange={(v) => setAssignTo(v as 'me' | 'other')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="me" id="assign-me" />
                <Label htmlFor="assign-me" className="cursor-pointer">
                  Para mim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="assign-other" />
                <Label htmlFor="assign-other" className="cursor-pointer">
                  Para outro membro
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Member Selection */}
          {assignTo === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="assignee">Membro</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar membro" />
                </SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => m.user_id !== user?.id)
                  .map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.email || 'Membro'}
                    </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Prazo</Label>
            <RadioGroup
              value={duePreset}
              onValueChange={(v) =>
                setDuePreset(v as 'today' | 'tomorrow' | 'week' | 'custom')
              }
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="today" id="due-today" />
                <Label htmlFor="due-today" className="cursor-pointer text-sm">
                  Hoje
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tomorrow" id="due-tomorrow" />
                <Label htmlFor="due-tomorrow" className="cursor-pointer text-sm">
                  Amanhã
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="due-week" />
                <Label htmlFor="due-week" className="cursor-pointer text-sm">
                  Daqui a 1 semana
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="due-custom" />
                <Label htmlFor="due-custom" className="cursor-pointer text-sm">
                  Personalizado
                </Label>
              </div>
            </RadioGroup>

            {duePreset === 'custom' && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Adicionar contexto..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                (assignTo === 'other' && !assigneeId) ||
                (duePreset === 'custom' && !customDate) ||
                createFollowup.isPending
              }
            >
              {createFollowup.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar FollowUp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
