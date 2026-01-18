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
import { Loader2, Flag } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface CreateQuickFollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function CreateQuickFollowUpModal({
  open,
  onOpenChange,
  conversationId,
}: CreateQuickFollowUpModalProps) {
  const { user } = useAuth();
  const { createQuickFollowup } = useFollowups();
  const { members } = useWorkspaceMembers();

  const [assignTo, setAssignTo] = useState<'me' | 'other'>('me');
  const [assigneeId, setAssigneeId] = useState('');
  const [duePreset, setDuePreset] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('tomorrow');
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

    await createQuickFollowup.mutateAsync({
      conversationId,
      assignedTo: targetUserId,
      dueAt: getDueDate(),
      note: note.trim() || undefined,
    });

    handleClose();
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
            Criar Lembrete Rápido
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="quick-note">O que precisa lembrar? *</Label>
            <Textarea
              id="quick-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Verificar aprovação do cliente..."
              rows={3}
              autoFocus
            />
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
                <RadioGroupItem value="me" id="quick-assign-me" />
                <Label htmlFor="quick-assign-me" className="cursor-pointer">
                  Para mim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="quick-assign-other" />
                <Label htmlFor="quick-assign-other" className="cursor-pointer">
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
              onValueChange={(v) => setDuePreset(v as 'today' | 'tomorrow' | 'week' | 'custom')}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="today" id="quick-due-today" />
                <Label htmlFor="quick-due-today" className="cursor-pointer text-sm">
                  Hoje
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tomorrow" id="quick-due-tomorrow" />
                <Label htmlFor="quick-due-tomorrow" className="cursor-pointer text-sm">
                  Amanhã
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="quick-due-week" />
                <Label htmlFor="quick-due-week" className="cursor-pointer text-sm">
                  Daqui a 1 semana
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="quick-due-custom" />
                <Label htmlFor="quick-due-custom" className="cursor-pointer text-sm">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                !note.trim() ||
                (assignTo === 'other' && !assigneeId) ||
                (duePreset === 'custom' && !customDate) ||
                createQuickFollowup.isPending
              }
            >
              {createQuickFollowup.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Lembrete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
