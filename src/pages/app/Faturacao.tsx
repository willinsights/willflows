import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CreditCard, 
  Download, 
  ExternalLink, 
  FileText, 
  Receipt, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

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

export default function Faturacao() {
  const { workspace, membership } = useWorkspace();
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const isAdmin = membership?.role === 'admin';

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
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
      toast.error('Erro ao carregar informações de faturação');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
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
      toast.error('Erro ao abrir portal de gestão');
    } finally {
      setPortalLoading(false);
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

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">Apenas administradores podem aceder às informações de faturação.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Faturação</h1>
          <p className="text-muted-foreground">Gerir pagamentos, faturas e método de pagamento</p>
        </div>
        <Button 
          onClick={handleManageSubscription} 
          disabled={portalLoading || !billingInfo?.hasCustomer}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {portalLoading ? 'A abrir...' : 'Gerir Subscrição'}
        </Button>
      </motion.div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map(i => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-56 mt-2" /></CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </CardContent>
          </Card>
        </div>
      ) : !billingInfo?.hasCustomer ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sem histórico de faturação</h3>
              <p className="text-muted-foreground mb-4">
                Ainda não existe nenhuma informação de faturação associada à sua conta.
              </p>
              <Button onClick={() => window.location.href = '/planos'}>
                Ver Planos
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Subscription & Payment Method Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            {i === 0 ? (
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
                      <span className="font-medium capitalize">Plano Ativo</span>
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
                    <Button size="sm" onClick={() => window.location.href = '/planos'}>
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

          {/* Invoice History */}
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
        </>
      )}
    </div>
  );
}
