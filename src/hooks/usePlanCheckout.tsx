import { useCallback, useState } from 'react';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import {
  CHECKOUT_MESSAGES,
  PORTAL_MESSAGES,
  openBillingPortal,
  startPlanCheckout,
  type CheckoutResult,
  type PortalResult,
  type StartPlanCheckoutParams,
} from '@/lib/billing/startPlanCheckout';

/**
 * Compra de plano e portal de faturação com as mensagens comuns a todos os ecrãs.
 * Quando a conta já tem plano, ou tem um pagamento de subscrição pendente, mostra a
 * mensagem própria com a ação que abre o portal.
 */
export function usePlanCheckout() {
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = useCallback(async (): Promise<PortalResult> => {
    setPortalLoading(true);
    try {
      const result = await openBillingPortal();
      if (result.status !== 'redirected') {
        toast({
          title: 'Gestão de subscrição',
          description: result.message ?? PORTAL_MESSAGES.error,
          variant: 'destructive',
        });
      }
      return result;
    } finally {
      setPortalLoading(false);
    }
  }, [toast]);

  const checkout = useCallback(
    async (
      params: StartPlanCheckoutParams,
      options?: { inlineAlreadySubscribed?: boolean },
    ): Promise<CheckoutResult> => {
      const result = await startPlanCheckout(params);

      if (result.status === 'payment_pending') {
        // Diálogos bloqueantes mostram a mensagem e a ação dentro do próprio diálogo
        if (options?.inlineAlreadySubscribed) return result;

        toast({
          title: 'Pagamento pendente',
          description: CHECKOUT_MESSAGES.payment_pending,
          action: (
            <ToastAction altText="Abrir a gestão de subscrição" onClick={() => void openPortal()}>
              Gerir subscrição
            </ToastAction>
          ),
        });
      } else if (result.status === 'already_subscribed') {
        // Diálogos bloqueantes mostram a mensagem e a ação dentro do próprio diálogo
        if (options?.inlineAlreadySubscribed) return result;

        toast({
          title: 'Esta conta já tem um plano',
          description: CHECKOUT_MESSAGES.already_subscribed,
          action: (
            <ToastAction altText="Abrir a gestão de subscrição" onClick={() => void openPortal()}>
              Gerir subscrição
            </ToastAction>
          ),
        });
      } else if (result.status !== 'redirected') {
        toast({
          title: 'Erro ao iniciar checkout',
          description: result.message ?? CHECKOUT_MESSAGES.error,
          variant: 'destructive',
        });
      }

      return result;
    },
    [toast, openPortal],
  );

  return { checkout, openPortal, portalLoading };
}
