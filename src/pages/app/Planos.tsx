import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Crown, 
  CreditCard, 
  Download, 
  ExternalLink, 
  FileText, 
  Receipt, 
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Info,
  Sparkles,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceSubscription } from '@/hooks/useWorkspaceSubscription';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PLANS as PLAN_INFO, getPriceId } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { StorageManagementCard } from '@/components/video-production/StorageManagementCard';

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  description: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  productId: string;
}

interface BillingInfo {
  hasCustomer: boolean;
  invoices: Invoice[];
  paymentMethod: PaymentMethod | null;
  subscription: Subscription | null;
}

function formatDaysRemaining(daysRemaining: number) {
  if (daysRemaining < 0) return 'Trial terminado';
  if (daysRemaining === 0) return 'Termina hoje';
  if (daysRemaining === 1) return '1 dia restante';
  return `${daysRemaining} dias restantes`;
}

function formatDatePt(date: Date, fmt: string) {
  if (!isValid(date)) return '—';
  try {
    return format(date, fmt, { locale: pt });
  } catch {
    return '—';
  }
}

export default function Planos() {
  const { currentWorkspace } = useWorkspace();
  const { 
    subscription, 
    plan: currentPlan,
    isTrial,
    trialExpired,
    trialEndsAt,
    trialDaysRemaining,
    canManageSubscription,
    loading: userSubLoading 
  } = useWorkspaceSubscription();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('planos');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [currency, setCurrency] = useState<'eur' | 'brl'>(() => {
    return (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
  });
  
  // Billing state (only for admins)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  // Use workspace subscription data
  const isSubscribed = subscription?.status === 'active';

  // Fetch billing info only for admins
  useEffect(() => {
    if (canManageSubscription) {
      fetchBillingInfo();
    } else {
      setBillingLoading(false);
    }
  }, [canManageSubscription]);

  const fetchBillingInfo = async () => {
    try {
      setBillingLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sonnerToast.error('Sessão expirada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('get-billing-info', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setBillingInfo(data);
    } catch (error: any) {
      console.error('Error fetching billing info:', error);
    } finally {
      setBillingLoading(false);
    }
  };

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

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
      case 'open':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'void':
      case 'uncollectible':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status || 'N/A'}</Badge>;
    }
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand?.toLowerCase();
    if (brandLower === 'visa') return '💳 Visa';
    if (brandLower === 'mastercard') return '💳 Mastercard';
    if (brandLower === 'amex') return '💳 Amex';
    return `💳 ${brand}`;
  };

  const currencySymbol = currency === 'eur' ? '€' : 'R$';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-muted-foreground">Gerir plano, subscrição e faturação</p>
        </div>
        {canManageSubscription && (
          <Button 
            onClick={handleManageSubscription} 
            disabled={portalLoading || (!billingInfo?.hasCustomer && !isTrial)}
            variant="outline"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {portalLoading ? 'A abrir...' : 'Gerir no Stripe'}
          </Button>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={cn(
          "grid w-full lg:w-[400px]",
          canManageSubscription ? "grid-cols-3" : "grid-cols-1"
        )}>
          <TabsTrigger value="planos" className="gap-2">
            <Crown className="h-4 w-4" />
            Planos
          </TabsTrigger>
          {canManageSubscription && (
            <>
              <TabsTrigger value="pagamento" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Pagamento
              </TabsTrigger>
              <TabsTrigger value="faturas" className="gap-2">
                <Receipt className="h-4 w-4" />
                Faturas
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Planos Tab */}
        <TabsContent value="planos" className="space-y-6">
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

              {/* Currency & Billing Toggle - Only for admins */}
              {canManageSubscription && (
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
              )}

              {/* Plans Grid */}
              <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
                {(['starter', 'pro', 'studio'] as const).map((planId) => {
                  const plan = PLAN_INFO[planId];
                  const internalPlanId = planId; // Now DB uses same names as UI
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
        </TabsContent>

        {/* Pagamento Tab - Admin Only */}
        {canManageSubscription && (
          <TabsContent value="pagamento" className="space-y-6">
            {billingLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            ) : !billingInfo?.hasCustomer ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sem método de pagamento</h3>
                    <p className="text-muted-foreground mb-4">
                      Subscreva um plano para adicionar um método de pagamento.
                    </p>
                    <Button onClick={() => setActiveTab('planos')}>
                      Ver Planos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Current Subscription */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Subscrição Atual
                      </CardTitle>
                      <CardDescription>Detalhes do seu plano ativo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {billingInfo.subscription ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Estado</span>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Plano</span>
                            <span className="font-medium capitalize">
                              {currentWorkspace?.subscription_plan || 'Starter'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Próxima faturação</span>
                            <span className="font-medium">
                              {formatDatePt(new Date(billingInfo.subscription.currentPeriodEnd * 1000), "d 'de' MMMM, yyyy")}
                            </span>
                          </div>
                          {billingInfo.subscription.cancelAtPeriodEnd && (
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                              <p className="text-sm text-yellow-400">
                                ⚠️ A subscrição será cancelada no final do período
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground mb-3">Sem subscrição ativa</p>
                          <Button size="sm" onClick={() => setActiveTab('planos')}>
                            Escolher Plano
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment Method */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Método de Pagamento
                      </CardTitle>
                      <CardDescription>Cartão registado para pagamentos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {billingInfo.paymentMethod ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                            <div className="text-2xl">{getCardBrandIcon(billingInfo.paymentMethod.brand)}</div>
                            <div>
                              <p className="font-medium">•••• •••• •••• {billingInfo.paymentMethod.last4}</p>
                              <p className="text-sm text-muted-foreground">
                                Expira {billingInfo.paymentMethod.expMonth.toString().padStart(2, '0')}/{billingInfo.paymentMethod.expYear}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            onClick={handleManageSubscription}
                            disabled={portalLoading}
                          >
                            Atualizar Cartão
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">Nenhum cartão registado</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Storage Add-ons - Only for Studio plan */}
                {currentPlan === 'studio' && (
                  <StorageManagementCard />
                )}
              </>
            )}
          </TabsContent>
        )}

        {/* Faturas Tab - Admin Only */}
        {canManageSubscription && (
          <TabsContent value="faturas" className="space-y-6">
            {billingLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : !billingInfo?.hasCustomer ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sem histórico de faturação</h3>
                    <p className="text-muted-foreground mb-4">
                      Ainda não existe nenhuma fatura associada à sua conta.
                    </p>
                    <Button onClick={() => setActiveTab('planos')}>
                      Ver Planos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Histórico de Faturas
                  </CardTitle>
                  <CardDescription>Todas as faturas e recibos da sua conta</CardDescription>
                </CardHeader>
                <CardContent>
                  {billingInfo.invoices.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Sem faturas disponíveis</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nº Fatura</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billingInfo.invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">
                                {invoice.number || invoice.id.slice(-8).toUpperCase()}
                              </TableCell>
                              <TableCell>
                                {formatDatePt(new Date(invoice.created * 1000), "d MMM yyyy")}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {invoice.description}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(invoice.status)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(invoice.amount, invoice.currency)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {invoice.invoicePdf && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => window.open(invoice.invoicePdf!, '_blank')}
                                      title="Baixar PDF"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {invoice.hostedInvoiceUrl && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => window.open(invoice.hostedInvoiceUrl!, '_blank')}
                                      title="Ver online"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
