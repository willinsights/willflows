import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crown, ExternalLink, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_INFO, getPriceId } from '@/lib/stripe-prices';
import { cn } from '@/lib/utils';
import { differenceInDays, format, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';

function formatDaysRemaining(daysRemaining: number) {
  if (daysRemaining < 0) return 'Trial terminado';
  if (daysRemaining === 0) return 'Termina hoje';
  if (daysRemaining === 1) return '1 dia restante';
  return `${daysRemaining} dias restantes`;
}

export function AccountPlanTab() {
  const { currentWorkspace, isAdmin } = useWorkspace();
  const { subscription, loading: subscriptionLoading } = useUserSubscription();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleOpenPortal = async () => {
    if (!isAdmin) {
      toast({
        title: 'Sem permissão',
        description: 'Apenas administradores podem gerir a subscrição.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setPortalLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido';
      
      // Handle case where user has no Stripe customer (trial only)
      if (errorMessage.includes('No Stripe customer found')) {
        toast({
          title: 'Sem subscrição ativa',
          description: 'Escolha um plano abaixo para começar.',
        });
      } else {
        toast({
          title: 'Erro ao abrir portal',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (planId: 'starter' | 'pro' | 'studio') => {
    if (!isAdmin) {
      toast({
        title: 'Sem permissão',
        description: 'Apenas administradores podem alterar o plano.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCheckoutLoading(planId);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
      const priceId = getPriceId(planId, currencyKey, 'monthly');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { priceId, workspaceId: currentWorkspace?.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Use user subscription data
  const currentPlan = subscription?.plan || 'essencial';
  const isSubscribed = subscription?.status === 'active';
  const isTrial = subscription?.status === 'trialing';

  const trialEndsDate = useMemo(() => {
    if (!subscription?.trialEndsAt) return null;
    try {
      const d = parseISO(subscription.trialEndsAt);
      return isValid(d) ? d : null;
    } catch {
      return null;
    }
  }, [subscription?.trialEndsAt]);

  const trialDaysRemaining = useMemo(() => {
    if (!trialEndsDate) return null;
    return differenceInDays(trialEndsDate, new Date());
  }, [trialEndsDate]);

  const trialExpired = isTrial && typeof trialDaysRemaining === 'number'
    ? trialDaysRemaining < 0
    : false;

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not admin warning
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-muted bg-muted/50">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Acesso restrito</p>
            <p className="text-sm text-muted-foreground">
              Apenas administradores do workspace podem gerir a subscrição.
            </p>
          </div>
        </div>

        {/* Show current plan info (read-only) */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Crown className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold capitalize">{currentPlan}</p>
              <p className="text-sm text-muted-foreground">Plano atual</p>
            </div>
          </div>
          <Badge variant="secondary">{isTrial ? 'Trial' : 'Ativo'}</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trial Expired Warning */}
      {trialExpired && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Trial expirado</p>
            <p className="text-sm text-muted-foreground">
              Escolha um plano para continuar a usar o WillFlow.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-lg border",
        trialExpired 
          ? "border-destructive/30 bg-destructive/5" 
          : "border-primary/20 bg-primary/5"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            trialExpired ? "bg-destructive/10" : "bg-primary/10"
          )}>
            <Crown className={cn(
              "h-5 w-5",
              trialExpired ? "text-destructive" : "text-primary"
            )} />
          </div>
          <div>
            <p className="font-semibold capitalize">{currentPlan}</p>
            <p className="text-sm text-muted-foreground">
              {trialExpired ? 'Trial expirado' : isTrial ? 'Período de teste' : 'Subscrição ativa'}
              {isTrial && !trialExpired && typeof trialDaysRemaining === 'number' && (
                <span className="ml-2 text-foreground/80">• {formatDaysRemaining(trialDaysRemaining)}</span>
              )}
            </p>
          </div>
        </div>
        <Badge variant={trialExpired ? 'destructive' : isTrial ? 'secondary' : 'default'}>
          {trialExpired ? 'Expirado' : isTrial ? 'Trial' : 'Ativo'}
        </Badge>
      </div>

      {subscription?.currentPeriodEnd && isSubscribed && (
        <p className="text-sm text-muted-foreground">
          Próxima renovação:{' '}
          <span className="font-medium text-foreground">
            {format(new Date(subscription.currentPeriodEnd), "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </span>
        </p>
      )}

      {/* Manage Subscription Button - Only show if user has active subscription */}
      {isSubscribed && (
        <Button
          variant="outline"
          onClick={handleOpenPortal}
          disabled={portalLoading}
          className="w-full"
        >
          {portalLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          Gerir Subscrição
        </Button>
      )}

      {/* Available Plans */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {trialExpired || isTrial ? 'Escolha o seu plano' : 'Planos Disponíveis'}
        </p>
        <div className="grid gap-2">
          {(['starter', 'pro', 'studio'] as const).map((planId) => {
            const plan = PLAN_INFO[planId];
            // Map PLAN_INFO keys to our internal plan names
            const internalPlanId = planId === 'starter' ? 'essencial' : planId;
            const isCurrentPlan = currentPlan === internalPlanId && !trialExpired;
            const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
            const price = plan.prices[currencyKey].monthly;
            const currencySymbol = currencyKey === 'eur' ? '€' : 'R$';
            const isPopular = planId === 'pro';

            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all',
                  isCurrentPlan ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                  isPopular && !isCurrentPlan && 'ring-1 ring-primary/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium capitalize">{plan.name}</p>
                      {isPopular && (
                        <Badge variant="default" className="text-[10px] gradient-primary">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currencySymbol}
                      {price}/mês
                    </p>
                  </div>
                </div>
                {isCurrentPlan ? (
                  <Badge>Atual</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(planId)}
                    disabled={checkoutLoading === planId}
                    className={cn(isPopular && 'gradient-primary')}
                  >
                    {checkoutLoading === planId && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <CreditCard className="h-4 w-4 mr-2" />
                    {trialExpired || isTrial ? 'Subscrever' : 'Mudar'}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        7 dias grátis • Cancele quando quiser
      </p>
    </div>
  );
}
