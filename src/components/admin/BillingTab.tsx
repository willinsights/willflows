import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  CreditCard,
  FileText,
  AlertTriangle,
  Webhook,
  Search,
  ExternalLink,
  MoreHorizontal,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Trash2,
  ShieldAlert,
  Loader2,
  Shield,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminBilling, Subscription, Invoice, WebhookLog } from '@/hooks/useAdminBilling';
import { getDisplayPlanName } from '@/lib/plans';

export function BillingTab() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="subscriptions">
        <TabsList className="mb-4">
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="dunning" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Dunning
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="reset" className="gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Reset
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <SubscriptionsSubTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesSubTab />
        </TabsContent>
        <TabsContent value="dunning">
          <DunningSubTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksSubTab />
        </TabsContent>
        <TabsContent value="reset">
          <ResetBillingSubTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubscriptionsSubTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { subscriptions, billingStats, isLoading, cancelSubscription, isCanceling } = useAdminBilling();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return format(new Date(date), 'dd MMM yyyy', { locale: pt });
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      active: { label: 'Ativo', variant: 'default' },
      trialing: { label: 'Trial', variant: 'secondary' },
      past_due: { label: 'Past Due', variant: 'outline' },
      canceled: { label: 'Cancelado', variant: 'destructive' },
    };
    const s = statuses[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = search === '' || 
      sub.user_email.toLowerCase().includes(search.toLowerCase()) ||
      sub.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.subscription_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{formatCurrency(billingStats.totalMRR)}</p>
            <p className="text-xs text-muted-foreground">MRR Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-emerald-500">{billingStats.activeCount}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-500">{billingStats.trialingCount}</p>
            <p className="text-xs text-muted-foreground">Em Trial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-500">{billingStats.pastDueCount}</p>
            <p className="text-xs text-muted-foreground">Past Due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-red-500">{billingStats.canceledCount}</p>
            <p className="text-xs text-muted-foreground">Canceladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizador</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Próximo Billing</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-sm">{sub.user_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{sub.user_email}</p>
                      </div>
                      {(sub as any).isSuperAdmin && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {getDisplayPlanName(sub.subscription_plan)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(sub.subscription_status)}</TableCell>
                  <TableCell>
                    {(sub as any).isSuperAdmin ? (
                      <span className="text-muted-foreground text-sm">—</span>
                    ) : (
                      formatCurrency(sub.mrr)
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(sub.current_period_end)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {sub.stripe_customer_id && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Ver no Stripe
                            </a>
                          </DropdownMenuItem>
                        )}
                        {sub.subscription_status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => cancelSubscription(sub.id)}
                            className="text-destructive"
                            disabled={isCanceling}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoicesSubTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { invoices, isLoading } = useAdminBilling();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value / 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: pt });
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      paid: { label: 'Pago', icon: <CheckCircle className="h-3 w-3" />, className: 'text-emerald-500' },
      open: { label: 'Aberto', icon: <Clock className="h-3 w-3" />, className: 'text-amber-500' },
      void: { label: 'Anulado', icon: <XCircle className="h-3 w-3" />, className: 'text-muted-foreground' },
      uncollectible: { label: 'Incobr.', icon: <XCircle className="h-3 w-3" />, className: 'text-red-500' },
    };
    const s = statuses[status] || { label: status, icon: null, className: '' };
    return (
      <Badge variant="outline" className={`gap-1 ${s.className}`}>
        {s.icon}
        {s.label}
      </Badge>
    );
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = search === '' || 
      inv.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      inv.stripe_invoice_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por email ou invoice ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="void">Anulados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Utilizador</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{inv.stripe_invoice_id.slice(-8)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{inv.user_email || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatCurrency(inv.amount_total)}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(inv.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {inv.hosted_invoice_url && (
                          <DropdownMenuItem asChild>
                            <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Ver Invoice
                            </a>
                          </DropdownMenuItem>
                        )}
                        {inv.invoice_pdf_url && (
                          <DropdownMenuItem asChild>
                            <a href={inv.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DunningSubTab() {
  const { dunningSubscriptions, isLoading } = useAdminBilling();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return format(new Date(date), 'dd MMM yyyy', { locale: pt });
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (dunningSubscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
          <h3 className="font-medium">Sem pagamentos em atraso</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as subscrições estão em dia.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <p className="text-sm">
          <strong>{dunningSubscriptions.length}</strong> subscrição(ões) com pagamento em atraso
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizador</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>MRR em Risco</TableHead>
                <TableHead>Fim do Período</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dunningSubscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{sub.user_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{sub.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {sub.subscription_plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-orange-500">{formatCurrency(sub.mrr)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(sub.current_period_end)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {sub.stripe_customer_id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a
                          href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function WebhooksSubTab() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { webhookLogs, isLoading } = useAdminBilling();

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return format(new Date(date), 'dd MMM HH:mm:ss', { locale: pt });
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      received: { label: 'Recebido', variant: 'secondary' },
      processed: { label: 'Processado', variant: 'default' },
      failed: { label: 'Falhou', variant: 'destructive' },
    };
    const s = statuses[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const filteredLogs = webhookLogs.filter(log => {
    return statusFilter === 'all' || log.status === statusFilter;
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (webhookLogs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium">Sem webhooks registados</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Os eventos de webhook aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="received">Recebidos</SelectItem>
            <SelectItem value="processed">Processados</SelectItem>
            <SelectItem value="failed">Falhados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Event ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Processado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{log.event_type}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {log.event_id.slice(-12)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(log.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(log.processed_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ResetBillingSubTab() {
  const [confirmInput, setConfirmInput] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { 
    resetPreview, 
    isLoadingPreview, 
    fetchResetPreview, 
    executeReset, 
    isResetting 
  } = useAdminBilling();

  const handlePreview = async () => {
    await fetchResetPreview();
  };

  const handleReset = () => {
    if (confirmInput === 'RESET') {
      executeReset();
      setShowConfirmDialog(false);
      setConfirmInput('');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Reset Dados de Billing</CardTitle>
          </div>
          <CardDescription>
            Esta ação irá limpar todos os dados de teste de billing mantendo as contas protegidas intactas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <p className="font-medium">Esta ação irá:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Apagar <strong>todos os invoices</strong> da base de dados</li>
              <li>Apagar <strong>todos os webhook logs</strong> da base de dados</li>
              <li>Reset subscrições não-protegidas para <strong>trial de 30 dias</strong></li>
              <li>Limpar IDs do Stripe (stripe_customer_id, stripe_subscription_id)</li>
            </ul>
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 space-y-2 text-sm">
            <p className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Contas Protegidas (não serão afetadas):
            </p>
            {resetPreview?.protectedEmails ? (
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {resetPreview.protectedEmails.map((email: string) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">
                Clique em "Pré-visualizar" para ver a lista de contas protegidas configuradas na base de dados.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              <em>+ Contas de teste (*@test.willflow.local)</em>
            </p>
          </div>

          <Button 
            onClick={handlePreview} 
            variant="outline" 
            disabled={isLoadingPreview}
            className="w-full"
          >
            {isLoadingPreview ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A carregar...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Pré-visualizar alterações
              </>
            )}
          </Button>

          {resetPreview && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pré-visualização do Reset</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold text-destructive">{resetPreview.subscriptionsToReset}</p>
                    <p className="text-xs text-muted-foreground">Subscrições a resetar</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold text-emerald-500">{resetPreview.protectedSubscriptions}</p>
                    <p className="text-xs text-muted-foreground">Subscrições protegidas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{resetPreview.invoicesToDelete}</p>
                    <p className="text-xs text-muted-foreground">Invoices a apagar</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{resetPreview.webhookLogsToDelete}</p>
                    <p className="text-xs text-muted-foreground">Webhook logs a apagar</p>
                  </div>
                </div>

                <Button 
                  onClick={() => setShowConfirmDialog(true)}
                  variant="destructive" 
                  className="w-full mt-4"
                  disabled={resetPreview.subscriptionsToReset === 0 && resetPreview.invoicesToDelete === 0 && resetPreview.webhookLogsToDelete === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Executar Reset
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Confirmar Reset de Billing
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Esta ação é <strong>irreversível</strong>. Tens a certeza que queres continuar?
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Escreve <strong>RESET</strong> para confirmar:
                </p>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="RESET"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmInput('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={confirmInput !== 'RESET' || isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A executar...
                </>
              ) : (
                'Confirmar Reset'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
