import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_INFO, getPriceId } from '@/lib/stripe-prices';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export function AccountPlanTab() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    plan: string | null;
    subscription_end: string | null;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setSubscriptionLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) throw error;
        setSubscriptionData(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao abrir portal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (planId: 'starter' | 'pro' | 'studio') => {
    try {
      setCheckoutLoading(planId);
      const { data: { session } } = await supabase.auth.getSession();
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

  const currentPlan = subscriptionData?.plan || currentWorkspace?.subscription_plan || 'essencial';
  const isSubscribed = subscriptionData?.subscribed ?? false;

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold capitalize">{currentPlan}</p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed ? 'Subscrição ativa' : 'Período de teste'}
            </p>
          </div>
        </div>
        <Badge variant={isSubscribed ? 'default' : 'secondary'}>
          {isSubscribed ? 'Ativo' : 'Trial'}
        </Badge>
      </div>

      {subscriptionData?.subscription_end && (
        <p className="text-sm text-muted-foreground">
          Próxima renovação:{' '}
          <span className="font-medium text-foreground">
            {format(new Date(subscriptionData.subscription_end), "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </span>
        </p>
      )}

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
        <p className="text-sm font-medium">Planos Disponíveis</p>
        <div className="grid gap-2">
          {(['essencial', 'pro', 'studio'] as const).map((planId) => {
            // Map our internal plan names to the PLAN_INFO keys
            const planInfoKey = planId === 'essencial' ? 'starter' : planId;
            const plan = PLAN_INFO[planInfoKey as keyof typeof PLAN_INFO];
            const isCurrentPlan = currentPlan === planId;
            const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
            const price = plan.prices[currencyKey].monthly;
            const currencySymbol = currencyKey === 'eur' ? '€' : 'R$';

            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all',
                  isCurrentPlan
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium capitalize">{planId}</p>
                    <p className="text-sm text-muted-foreground">
                      {currencySymbol}{price}/mês
                    </p>
                  </div>
                </div>
                {isCurrentPlan ? (
                  <Badge>Atual</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant={planId === 'pro' ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(planInfoKey as 'starter' | 'pro' | 'studio')}
                    disabled={checkoutLoading === planInfoKey}
                    className={cn(planId === 'pro' && 'gradient-primary')}
                  >
                    {checkoutLoading === planInfoKey && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {isSubscribed ? 'Mudar' : 'Upgrade'}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
