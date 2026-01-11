import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Crown, 
  CreditCard, 
  Download, 
  ExternalLink, 
  FileText, 
  Receipt, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PLAN_INFO, getPriceId } from '@/lib/stripe-prices';
import { cn } from '@/lib/utils';

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

export default function Conta() {
  const { workspace, membership, isAdmin, currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('plano');
  
  // Billing state
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  
  // Subscription state
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    plan: string | null;
    subscription_end: string | null;
    trial_expired?: boolean;
  } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingInfo();
    fetchSubscription();
  }, []);

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

  const handleManageSubscription = async () => {
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency.toUpperCase(),
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

  const currentPlan = subscriptionData?.plan || currentWorkspace?.subscription_plan || 'essencial';
  const isSubscribed = subscriptionData?.subscribed ?? false;
  const trialExpired = subscriptionData?.trial_expired ?? false;

  const trialEndsAt = (currentWorkspace as any)?.trial_ends_at as string | null | undefined;
  const trialDaysRemaining = trialEndsAt ? differenceInDays(parseISO(trialEndsAt), new Date()) : null;

  const isTrial = (() => {
    const status = (currentWorkspace as any)?.subscription_status as string | undefined;
    if (status === 'active') return false;
    if (status === 'trialing') return true;
    return !isSubscribed || trialExpired === false;
  })();

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">Apenas administradores podem aceder às configurações de conta.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conta & Faturação</h1>
          <p className="text-muted-foreground">Gerir plano, subscrição, pagamentos e faturas</p>
        </div>
        <Button 
          onClick={handleManageSubscription} 
          disabled={portalLoading || (!billingInfo?.hasCustomer && !isTrial)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {portalLoading ? 'A abrir...' : 'Gerir no Stripe'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="plano" className="gap-2">
            <Crown className="h-4 w-4" />
            Plano
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="faturas" className="gap-2">
            <Receipt className="h-4 w-4" />
            Faturas
          </TabsTrigger>
        </TabsList>

        {/* Plano Tab */}
        <TabsContent value="plano" className="space-y-6">
          {subscriptionLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* Trial Expired Warning */}
              {trialExpired && (
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <div className="flex-1">
                        <p className="font-medium text-destructive">Trial expirado</p>
                        <p className="text-sm text-muted-foreground">
                          Escolha um plano para continuar a usar o WillFlow.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Plan Card */}
              <Card className={cn(
                trialExpired 
                  ? "border-destructive/30" 
                  : "border-primary/20"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
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
                        <CardTitle className="capitalize">{currentPlan}</CardTitle>
                        <CardDescription>
                          {trialExpired ? 'Trial expirado' : isTrial ? 'Período de teste' : 'Subscrição ativa'}
                          {isTrial && !trialExpired && typeof trialDaysRemaining === 'number' && (
                            <span className="ml-2">• {formatDaysRemaining(trialDaysRemaining)}</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={trialExpired ? 'destructive' : isTrial ? 'secondary' : 'default'}>
                      {trialExpired ? 'Expirado' : isTrial ? 'Trial' : 'Ativo'}
                    </Badge>
                  </div>
                </CardHeader>
                {subscriptionData?.subscription_end && !isTrial && !trialExpired && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Próxima renovação:{' '}
                      <span className="font-medium text-foreground">
                        {format(new Date(subscriptionData.subscription_end), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                      </span>
                    </p>
                  </CardContent>
                )}
              </Card>

              {/* Available Plans */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {trialExpired || isTrial ? 'Escolha o seu plano' : 'Planos Disponíveis'}
                  </CardTitle>
                  <CardDescription>
                    Compare os planos e escolha o melhor para si
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {(['starter', 'pro', 'studio'] as const).map((planId) => {
                      const plan = PLAN_INFO[planId];
                      const internalPlanId = planId === 'starter' ? 'essencial' : planId;
                      const isCurrentPlan = currentPlan === internalPlanId && !trialExpired;
                      const currencyKey = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur') as 'eur' | 'brl';
                      const price = plan.prices[currencyKey].monthly;
                      const yearlyPrice = plan.prices[currencyKey].yearly;
                      const currencySymbol = currencyKey === 'eur' ? '€' : 'R$';
                      const isPopular = planId === 'pro';

                      return (
                        <motion.div
                          key={planId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'relative flex flex-col p-4 rounded-xl border transition-all',
                            isCurrentPlan ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border hover:border-primary/50',
                            isPopular && !isCurrentPlan && 'ring-1 ring-primary/30'
                          )}
                        >
                          {isPopular && (
                            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 gradient-primary text-xs">
                              Popular
                            </Badge>
                          )}
                          {isCurrentPlan && (
                            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                              Atual
                            </Badge>
                          )}
                          
                          <div className="text-center pt-2 pb-4">
                            <h3 className="font-semibold text-lg">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          </div>

                          <div className="text-center pb-4">
                            <span className="text-3xl font-bold">{currencySymbol}{price}</span>
                            <span className="text-muted-foreground">/mês</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              ou {currencySymbol}{(yearlyPrice / 12).toFixed(0)}/mês anual
                            </p>
                          </div>

                          <div className="flex-1 space-y-2 pb-4">
                            {plan.features.slice(0, 6).map((feature, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                {feature.included ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                                )}
                                <span className={cn(!feature.included && 'text-muted-foreground/60')}>
                                  {typeof feature.value === 'string' ? feature.value : ''} {feature.name}
                                </span>
                              </div>
                            ))}
                          </div>

                          {isCurrentPlan ? (
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
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    7 dias grátis • Cancele quando quiser • Pagamento seguro via Stripe
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Pagamento Tab */}
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
                  <Button onClick={() => setActiveTab('plano')}>
                    Ver Planos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
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
                          {format(new Date(billingInfo.subscription.currentPeriodEnd * 1000), "d 'de' MMMM, yyyy", { locale: pt })}
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
                      <Button size="sm" onClick={() => setActiveTab('plano')}>
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
          )}
        </TabsContent>

        {/* Faturas Tab */}
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
                  <Button onClick={() => setActiveTab('plano')}>
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
                              {format(new Date(invoice.created * 1000), "d MMM yyyy", { locale: pt })}
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
      </Tabs>
    </div>
  );
}
