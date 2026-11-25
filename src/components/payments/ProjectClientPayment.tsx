import { CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { useClientPayment } from '@/hooks/useClientPayment';
import { Money } from '@/components/finance/Money';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RegisterClientPaymentDialog } from './RegisterClientPaymentDialog';

export function ProjectClientPayment({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useClientPayment(projectId);
  const paid = data?.client_payment_status === 'pago';
  return (
    <section className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <CreditCard className="h-4 w-4" /><span className="font-medium">Pagamento do Cliente</span>
      </div>
      {isLoading ? <Skeleton className="h-16 w-full" /> : isError ? (
        <p role="alert" className="text-sm text-destructive">Não foi possível carregar o pagamento.</p>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Money value={data.agreed_value ?? 0} className="text-lg font-semibold" />
            <Badge variant="outline">{paid ? 'Recebido' : data.client_payment_status === 'cancelado' ? 'Cancelado' : 'Por receber'}</Badge>
          </div>
          {paid && data.client_paid_at && <p className="text-xs text-muted-foreground">Recebido em {format(new Date(data.client_paid_at), 'dd/MM/yyyy')}</p>}
          {data.client_payment_due_date && <p className="text-xs text-muted-foreground">Vencimento: {format(new Date(data.client_payment_due_date), 'dd/MM/yyyy')}</p>}
          {!paid && (data.agreed_value ?? 0) > 0 && data.client_payment_status !== 'cancelado' && <RegisterClientPaymentDialog projectId={projectId} />}
          {!data.is_delivered && !paid && <p className="text-xs text-muted-foreground">O recebimento fica disponível após a entrega do projeto.</p>}
        </>
      ) : null}
    </section>
  );
}