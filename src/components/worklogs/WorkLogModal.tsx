import { useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useClients } from '@/hooks/useClients';
import { toast } from 'sonner';
import {
  useWorkLogs,
  WORK_LOG_STATUS_LABELS,
  WORK_LOG_TYPE_LABELS,
  type WorkLog,
  type WorkLogStatus,
  type WorkLogType,
} from '@/hooks/useWorkLogs';

interface WorkLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: WorkLog | null;
}

const NONE = '__none__';

export function WorkLogModal({ open, onOpenChange, editing }: WorkLogModalProps) {
  const { members } = useWorkspaceMembers();
  const { clients } = useClients();
  const { createWorkLog, updateWorkLog } = useWorkLogs();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState<WorkLogType>('edicao_video');
  const [assigneeId, setAssigneeId] = useState<string>(NONE);
  const [clientId, setClientId] = useState<string>(NONE);
  const [requestedAt, setRequestedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [completedAt, setCompletedAt] = useState('');
  const [status, setStatus] = useState<WorkLogStatus>('pendente');
  const [isUrgent, setIsUrgent] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? '');
      setWorkType(editing.work_type);
      setAssigneeId(editing.assignee_id ?? NONE);
      setClientId(editing.client_id ?? NONE);
      setRequestedAt(editing.requested_at);
      setCompletedAt(editing.completed_at ?? '');
      setStatus(editing.status);
      setIsUrgent(editing.is_urgent);
      setAmount(editing.amount != null ? String(editing.amount) : '');
    } else {
      setTitle('');
      setDescription('');
      setWorkType('edicao_video');
      setAssigneeId(NONE);
      setClientId(NONE);
      setRequestedAt(new Date().toISOString().slice(0, 10));
      setCompletedAt('');
      setStatus('pendente');
      setIsUrgent(false);
      setAmount('');
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (title.trim().length < 3) {
      toast.error('Descreve o trabalho em pelo menos 3 caracteres');
      return;
    }
    if (assigneeId === NONE) {
      toast.error('Seleciona o colaborador responsável');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      work_type: workType,
      assignee_id: assigneeId,
      client_id: clientId === NONE ? null : clientId,
      requested_at: requestedAt,
      completed_at: completedAt || null,
      status,
      is_urgent: isUrgent,
      amount: amount ? Number(amount) : null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateWorkLog.mutateAsync({ id: editing.id, input: payload });
        toast.success('Registo atualizado');
      } else {
        await createWorkLog.mutateAsync(payload);
        toast.success('Trabalho registado');
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível guardar o registo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar registo' : 'Registar trabalho'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wl-title">O que foi pedido *</Label>
            <Input
              id="wl-title"
              value={title}
              maxLength={200}
              placeholder="Ex: Edição urgente de vídeo do cliente X"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de trabalho *</Label>
              <Select value={workType} onValueChange={(v) => setWorkType(v as WorkLogType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WORK_LOG_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wl-requested">Data do pedido *</Label>
              <Input
                id="wl-requested"
                type="date"
                value={requestedAt}
                onChange={(e) => setRequestedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-completed">Data de conclusão</Label>
              <Input
                id="wl-completed"
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as WorkLogStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WORK_LOG_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="wl-amount">Valor (opcional)</Label>
              <Input
                id="wl-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="wl-urgent">Urgente</Label>
                <p className="text-xs text-muted-foreground">Marcar como pedido urgente</p>
              </div>
              <Switch id="wl-urgent" checked={isUrgent} onCheckedChange={setIsUrgent} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wl-desc">Notas</Label>
            <Textarea
              id="wl-desc"
              rows={3}
              maxLength={2000}
              value={description}
              placeholder="Detalhes do pedido..."
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'A guardar...' : editing ? 'Guardar' : 'Registar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
