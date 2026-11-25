import { useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { useClientPayment } from '@/hooks/useClientPayment';
import { useToast } from '@/hooks/use-toast';
import { Money } from '@/components/finance/Money';

export function RegisterClientPaymentDialog({ projectId }: { projectId?: string }) {
  const [open, setOpen] = useState(false);
  const { canManagePayments } = useClientPayment();
  if (!canManagePayments) return null;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-2 w-full sm:w-auto">
        <CreditCard className="h-4 w-4" />Registar pagamento do cliente
      </Button>
      {open && <PaymentForm projectId={projectId} onClose={() => setOpen(false)} />}
    </>
  );
}

function PaymentForm({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const { projects, loading } = useProjects();
  const [selectedId, setSelectedId] = useState(projectId ?? '');
  const [paidDate, setPaidDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState('');
  const { data: selected, isLoading, isError, register, saving } = useClientPayment(selectedId);
  const { toast } = useToast();
  const eligible = projects.filter(p => p.is_delivered && (p.agreed_value ?? 0) > 0 &&
    (!p.client_payment_status || ['pendente', 'vencido', 'atrasado'].includes(p.client_payment_status)));
  const available = selected?.is_delivered && (selected.agreed_value ?? 0) > 0 &&
    (!selected.client_payment_status || ['pendente', 'vencido', 'atrasado'].includes(selected.client_payment_status));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!available || saving) return;
    setError('');
    try {
      await register({ projectId: selectedId, paidDate });
      toast({ title: 'Pagamento do cliente registado' });
      onClose();
    } catch {
      setError('Não foi possível registar. Confirma a permissão e se o projeto continua por receber.');
    }
  }
  return (
    <Dialog open onOpenChange={value => { if (!value && !saving) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagamento do cliente</DialogTitle>
          <DialogDescription>Recebimento integral do projeto</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {projectId ? (
            <p className="text-sm font-medium break-words">{selected?.name ?? 'A carregar projeto…'}</p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="payment-project">Projeto</Label>
              <Select value={selectedId} onValueChange={setSelectedId} disabled={loading || saving}>
                <SelectTrigger id="payment-project" className="w-full [&>span]:truncate"><SelectValue placeholder="Selecionar projeto" /></SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-3rem)]">
                  {eligible.map(p => <SelectItem key={p.id} value={p.id} className="break-words">{p.project_code ? `${p.project_code} · ` : ''}{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!loading && eligible.length === 0 && <p className="text-sm text-muted-foreground">Sem projetos entregues por receber.</p>}
            </div>
          )}
          {selectedId && !isLoading && !isError && selected && (
            <div className="space-y-1 border-y border-border py-3">
              <p className="text-sm text-muted-foreground">Valor a receber</p>
              <Money value={selected.agreed_value ?? 0} className="text-2xl font-semibold" />
              {!available && <p role="status" className="text-sm text-muted-foreground">{!selected.is_delivered ? 'Disponível após a entrega do projeto.' : 'Este projeto não tem um valor pendente por receber.'}</p>}
            </div>
          )}
          {isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar o projeto.</p>}
          <div className="space-y-2">
            <Label htmlFor="payment-date">Data de recebimento</Label>
            <Input id="payment-date" type="date" required max={format(new Date(), 'yyyy-MM-dd')} value={paidDate} onChange={e => setPaidDate(e.target.value)} disabled={saving} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={!available || !paidDate || saving || isLoading} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar recebimento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}