import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceSubscription } from '@/hooks/useWorkspaceSubscription';
import { usePlanCheckout } from '@/hooks/usePlanCheckout';
import { cn } from '@/lib/utils';
import { MANUAL_PLAN_MESSAGE, isManuallyGrantedPlan } from '@/lib/billing/accountPlan';

export function pastDueGraceMessage(daysLeft: number): string {
  return `Pagamento em atraso: faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} para o acesso ser limitado.`;
}

export const PAST_DUE_MEMBER_MESSAGE = 'Pagamento em atraso no plano deste workspace. Contacte o dono.';

/**
 * Aviso persistente durante a tolerância de pagamento em atraso. O workspace
 * continua ativo; depois da tolerância, o bloqueio é o do WorkspaceExpiredModal.
 */
export function PastDueBanner({ className }: { className?: string }) {
  const { isPastDueGrace, pastDueDaysLeft, isOwner, isSuperAdmin, loading } = useWorkspaceSubscription();
  const { subscription: accountSubscription } = useAuth();
  const { openPortal, portalLoading } = usePlanCheckout();

  if (loading || isSuperAdmin || !isPastDueGrace || pastDueDaysLeft === null) return null;

  // Plano atribuído manualmente: não há portal de faturação para abrir
  const manualPlan = isManuallyGrantedPlan({
    status: accountSubscription?.status,
    hasStripeSubscription: accountSubscription?.hasStripeSubscription,
  });

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-destructive/20 bg-destructive/10 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="text-sm font-medium">
          {isOwner ? pastDueGraceMessage(pastDueDaysLeft) : PAST_DUE_MEMBER_MESSAGE}
        </p>
      </div>
      {isOwner && (manualPlan ? (
        <p className="text-xs text-muted-foreground">{MANUAL_PLAN_MESSAGE}</p>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          className="shrink-0"
          onClick={() => void openPortal()}
          disabled={portalLoading}
        >
          {portalLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          Atualizar pagamento
        </Button>
      ))}
    </div>
  );
}
