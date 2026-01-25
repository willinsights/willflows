import { useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLeads, type Lead } from '@/hooks/useLeads';

const LOST_REASONS = [
  { value: 'preco', label: 'Preço elevado' },
  { value: 'concorrencia', label: 'Escolheu concorrência' },
  { value: 'timing', label: 'Timing inadequado' },
  { value: 'desistiu', label: 'Desistiu do projeto' },
  { value: 'sem_resposta', label: 'Sem resposta' },
  { value: 'fora_escopo', label: 'Fora do nosso escopo' },
  { value: 'outro', label: 'Outro motivo' },
];

interface MarkLostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

export function MarkLostModal({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: MarkLostModalProps) {
  const { updateLeadStatus } = useLeads();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const handleMarkLost = async () => {
    if (!lead) return;
    
    setLoading(true);

    const reasonLabel = LOST_REASONS.find(r => r.value === reason)?.label || reason;
    const lostReason = details ? `${reasonLabel}: ${details}` : reasonLabel;

    const result = await updateLeadStatus(lead.id, 'perdido', {
      lost_reason: lostReason,
    });

    setLoading(false);

    if (result) {
      onOpenChange(false);
      setReason('');
      setDetails('');
      onSuccess?.();
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Marcar Lead como Perdido
          </DialogTitle>
          <DialogDescription>
            Registe o motivo da perda de <strong>{lead.name}</strong> para análise futura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Lead Summary */}
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <span className="text-lg font-bold text-destructive">
                  {lead.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{lead.name}</p>
                {lead.company && (
                  <p className="text-sm text-muted-foreground">{lead.company}</p>
                )}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da Perda *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Detalhes (opcional)</Label>
              <Textarea
                id="details"
                placeholder="Informações adicionais sobre a perda..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleMarkLost} 
              disabled={loading || !reason}
              variant="destructive"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Marcar como Perdido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
