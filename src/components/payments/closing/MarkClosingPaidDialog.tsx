import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ClosingSettlement } from '@/hooks/useMonthlyClosing';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pending: ClosingSettlement[];
  totalLabel: string;
  onConfirm: (rows: ClosingSettlement[]) => Promise<void>;
}

export function MarkClosingPaidDialog({ open, onOpenChange, pending, totalLabel, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(pending);
      toast({ title: 'Fecho marcado como pago', description: `${pending.length} acerto(s) atualizado(s).` });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Erro ao marcar fecho',
        description: e instanceof Error ? e.message : 'Não foi possível atualizar os pagamentos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Marcar fecho como pago
          </DialogTitle>
          <DialogDescription>
            Vais marcar <strong>{pending.length}</strong> acerto{pending.length !== 1 ? 's' : ''} pendente{pending.length !== 1 ? 's' : ''} como pagos,
            no valor total de <strong>{totalLabel}</strong>. Esta ação pode ser revertida individualmente na página de Custos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading || pending.length === 0}>
            {loading ? 'A processar…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
