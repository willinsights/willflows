import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Crown, 
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Info,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { PLAN_INFO, getPriceId } from '@/lib/stripe-prices';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

function formatDaysRemaining(daysRemaining: number) {
  if (daysRemaining < 0) return 'Trial terminado';
  if (daysRemaining === 0) return 'Termina hoje';
  if (daysRemaining === 1) return '1 dia restante';
  return `${daysRemaining} dias restantes`;
}

export default function Planos() {
  const { isAdmin, currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { subscription: userSubscription, loading: userSubLoading } = useUserSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [currency, setCurrency] = useState<'eur' | 'brl'>(() => {
    return (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
  });

  // Check if user can manage subscription (admin of current workspace)
  const canManageSubscription = isAdmin;

  // Use user subscription data
  const currentPlan = userSubscription?.plan || 'essencial';
  const isSubscribed = userSubscription?.status === 'active';
  const isTrial = userSubscription?.status === 'trialing';

  const trialEndsDate = useMemo(() => {
    if (!userSubscription?.trialEndsAt) return null;
    try {
      const d = parseISO(userSubscription.trialEndsAt);
      return isValid(d) ? d : null;
    } catch {
      return null;
    }
  }, [userSubscription?.trialEndsAt]);

  const trialDaysRemaining = useMemo(() => {
    if (!trialEndsDate) return null;
    return differenceInDays(trialEndsDate, new Date());
  }, [trialEndsDate]);

  const trialExpired = isTrial && typeof trialDaysRemaining === 'number'
    ? trialDaysRemaining < 0
    : false;

  const handleUpgrade = async (planId: 'starter' | 'pro' | 'studio') => {
    if (!canManageSubscription) {
      toast({
        title: 'Sem permissão',
        description: 'Apenas administradores do workspace podem alterar o plano.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCheckoutLoading(planId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const priceId = getPriceId(planId, currency, billingInterval);

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

  const handleManageSubscription = async () => {
    if (!canManageSubscription) {
      toast({
        title: 'Sem permissão',
        description: 'Apenas administradores do workspace podem gerir a subscrição.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setPortalLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sonnerToast.error('Sessão expirada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      const errorMessage = error.message || 'Erro desconhecido';
      
      if (errorMessage.includes('No Stripe customer found')) {
        toast({
          title: 'Sem subscrição ativa',
          description: 'Escolha um plano para começar.',
        });
      } else {
        sonnerToast.error('Erro ao abrir portal de gestão');
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const currencySymbol = currency === 'eur' ? '€' : 'R$';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Planos & Subscrição</h1>
        <p className="text-muted-foreground">
          Escolha o plano ideal para o seu negócio
        </p>
      </div>

      {userSubLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* Trial/Status Banner */}
          {(isTrial || trialExpired) && (
            <Card className={cn(
              "border",
              trialExpired 
                ? "border-destructive/50 bg-destructive/10" 
                : "border-primary/20 bg-primary/5"
            )}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {trialExpired ? (
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    {trialExpired ? (
                      <>
                        <p className="font-medium text-destructive">Trial expirado</p>
                        <p className="text-sm text-muted-foreground">
                          Escolha um plano para continuar a usar o WillFlow.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Período de Trial</p>
                        <p className="text-sm text-muted-foreground">
                          {typeof trialDaysRemaining === 'number' && formatDaysRemaining(trialDaysRemaining)}
                          {' - '}Aproveite todas as funcionalidades durante o trial.
                        </p>
                      </>
                    )}
                  </div>
                  {isSubscribed && canManageSubscription && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                    >
                      {portalLoading ? 'A abrir...' : 'Gerir Subscrição'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Plan Banner for Active Subscribers */}
          {isSubscribed && !isTrial && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium capitalize">Plano {currentPlan}</p>
                      <p className="text-sm text-muted-foreground">Subscrição ativa</p>
                    </div>
                    <Badge variant="default" className="ml-2">Ativo</Badge>
                  </div>
                  {canManageSubscription && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                    >
                      {portalLoading ? 'A abrir...' : 'Gerir Subscrição'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Permission Notice for Non-Admins */}
          {!canManageSubscription && (
            <Card className="border-muted bg-muted/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium">Plano gerido pelo administrador</p>
                    <p className="text-sm text-muted-foreground">
                      Está a usar o plano <span className="font-medium capitalize">{currentPlan}</span> deste workspace. 
                      Contacte o administrador para alterar o plano.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Currency & Billing Toggle */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <ToggleGroup 
              type="single" 
              value={currency} 
              onValueChange={(v) => v && setCurrency(v as 'eur' | 'brl')}
              className="border rounded-lg p-1"
            >
              <ToggleGroupItem value="eur" className="px-3 text-sm">
                EUR €
              </ToggleGroupItem>
              <ToggleGroupItem value="brl" className="px-3 text-sm">
                BRL R$
              </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup 
              type="single" 
              value={billingInterval} 
              onValueChange={(v) => v && setBillingInterval(v as 'monthly' | 'yearly')}
              className="border rounded-lg p-1"
            >
              <ToggleGroupItem value="monthly" className="px-3 text-sm">
                Mensal
              </ToggleGroupItem>
              <ToggleGroupItem value="yearly" className="px-3 text-sm">
                Anual
                <Badge variant="secondary" className="ml-2 text-[10px]">-20%</Badge>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Plans Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {(['starter', 'pro', 'studio'] as const).map((planId) => {
              const plan = PLAN_INFO[planId];
              const internalPlanId = planId === 'starter' ? 'essencial' : planId;
              const isCurrentPlan = currentPlan === internalPlanId && !trialExpired;
              const price = billingInterval === 'monthly' 
                ? plan.prices[currency].monthly 
                : plan.prices[currency].yearly;
              const monthlyEquivalent = billingInterval === 'yearly' 
                ? Math.round(price / 12) 
                : price;
              const isPopular = planId === 'pro';

              return (
                <motion.div
                  key={planId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: planId === 'starter' ? 0 : planId === 'pro' ? 0.1 : 0.2 }}
                >
                  <Card
                    className={cn(
                      'relative h-full flex flex-col transition-all',
                      isCurrentPlan 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                        : 'border-border hover:border-primary/50',
                      isPopular && !isCurrentPlan && 'ring-1 ring-primary/30'
                    )}
                  >
                    {isPopular && !isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-xs px-3">
                        Recomendado
                      </Badge>
                    )}
                    {isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3">
                        Plano Atual
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center pt-6">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      {/* Price */}
                      <div className="text-center pb-6">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">{currencySymbol}{monthlyEquivalent}</span>
                          <span className="text-muted-foreground">/mês</span>
                        </div>
                        {billingInterval === 'yearly' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {currencySymbol}{price} cobrado anualmente
                          </p>
                        )}
                      </div>

                      {/* Features */}
                      <div className="flex-1 space-y-3 pb-6">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            {feature.included ? (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={cn(!feature.included && 'text-muted-foreground/60')}>
                              {typeof feature.value === 'string' || typeof feature.value === 'number' 
                                ? `${feature.value} ` 
                                : ''
                              }
                              {feature.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action Button */}
                      {canManageSubscription ? (
                        isCurrentPlan ? (
                          <Button variant="outline" disabled className="w-full">
                            Plano Atual
                          </Button>
                        ) : (
                          <Button
                            variant={isPopular ? 'default' : 'outline'}
                            onClick={() => handleUpgrade(planId)}
                            disabled={checkoutLoading === planId}
                            className={cn('w-full', isPopular && 'gradient-primary')}
                          >
                            {checkoutLoading === planId && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            {trialExpired || isTrial ? 'Subscrever' : 'Mudar Plano'}
                          </Button>
                        )
                      ) : (
                        <Button variant="outline" disabled className="w-full">
                          {isCurrentPlan ? 'Plano Atual' : 'Contactar Admin'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Todos os planos incluem suporte por email e atualizações gratuitas.</p>
            <p>Pode cancelar a qualquer momento sem compromisso.</p>
          </div>
        </>
      )}
    </div>
  );
}
