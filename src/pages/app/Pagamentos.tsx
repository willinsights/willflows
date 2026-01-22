import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Users,
  Package,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { usePayments, useTeamPayments } from '@/hooks/usePayments';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ClientPaymentsControl } from '@/components/payments/ClientPaymentsControl';
import { FreelancerPaymentsControl, type ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';
import { PaymentExportButtons } from '@/components/payments/PaymentExportButtons';
import { ExtraCostsPaymentsControl, type ProjectCustoExtra } from '@/components/payments/ExtraCostsPaymentsControl';
import { UpgradeAlert } from '@/components/subscription/UpgradeAlert';
import { useQueryClient } from '@tanstack/react-query';

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/10 text-warning border-warning/20',
  pago: 'bg-success/10 text-success border-success/20',
  vencido: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelado: 'bg-muted text-muted-foreground',
};


export default function Pagamentos() {
  const { payments, loading, summaries, updatePaymentStatus } = usePayments();
  const { teamPayments, updateTeamPaymentStatus } = useTeamPayments();
  const { projects } = useProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const { members } = useWorkspaceMembers();
  const { canViewAllFinancials, canViewOwnFinancials, userId, userRole } = useFinancialPermissions();
  const { hasFeatureAccess, checkFeature, upgradeAlert, closeUpgradeAlert, getFeatureInfo, getUpgradePlan } = usePlanFeatures();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('previsao');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  
  const canExportPdf = hasFeatureAccess('exportPdf');
  
  // Data for extra costs
  const [projectCosts, setProjectCosts] = useState<ProjectCustoExtra[]>([]);
  
  // Fetch all project costs (not just pending)
  const [allProjectCosts, setAllProjectCosts] = useState<ProjectCustoExtra[]>([]);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Fetch project extra costs
  useEffect(() => {
    const fetchAdditionalData = async () => {
      if (!currentWorkspace?.id) return;
      
      // Fetch projects with pending extra costs (for summaries)
      const { data: costsData } = await supabase
        .from('projects')
        .select('id, name, project_code, custos_extras, custos_extras_payment_status')
        .eq('workspace_id', currentWorkspace.id)
        .gt('custos_extras', 0)
        .in('custos_extras_payment_status', ['pendente', 'vencido', null]);
      
      if (costsData) {
        setProjectCosts(costsData as ProjectCustoExtra[]);
      }
      
      // Fetch ALL projects with extra costs (for the tab)
      const { data: allCostsData } = await supabase
        .from('projects')
        .select('id, name, project_code, custos_extras, custos_extras_payment_status')
        .eq('workspace_id', currentWorkspace.id)
        .gt('custos_extras', 0);
      
      if (allCostsData) {
        setAllProjectCosts(allCostsData as ProjectCustoExtra[]);
      }
    };
    
    fetchAdditionalData();
  }, [currentWorkspace?.id]);

  // Filter payments for the current month view
  // Non-admins only see their own payments (where collaborator_id matches userId)
  const monthPayments = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    let filteredPayments = payments.filter(payment => {
      if (!payment.due_date) return false;
      const dueDate = new Date(payment.due_date);
      return isWithinInterval(dueDate, { start, end });
    });

    // Non-admins only see their own receivable payments
    if (!canViewAllFinancials && userId) {
      filteredPayments = filteredPayments.filter(p => 
        p.is_receivable && p.collaborator_id === userId
      );
    }

    return filteredPayments;
  }, [payments, currentMonth, canViewAllFinancials, userId]);

  // Cast teamPayments to the correct type
  const typedTeamPayments = teamPayments as ProjectTeamPayment[];

  // Calculate monthly forecasts including collaborators and extra costs
  const monthlyForecast = useMemo(() => {
    const receivable = monthPayments.filter(p => p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0);
    const payable = monthPayments.filter(p => !p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0);
    
    // Team payments by phase
    const teamCaptacao = typedTeamPayments
      .filter(tp => tp.phase === 'captacao' && tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    
    const teamEdicao = typedTeamPayments
      .filter(tp => tp.phase === 'edicao' && tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    
    const teamTotal = teamCaptacao + teamEdicao;
    
    // Extra costs
    const custosExtras = projectCosts
      .filter(p => p.custos_extras_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.custos_extras || 0), 0);
    
    const totalPayable = payable + teamTotal + custosExtras;
    
    return { 
      receivable, 
      payable, 
      teamTotal,
      teamCaptacao,
      teamEdicao,
      custosExtras,
      totalPayable,
      net: receivable - totalPayable 
    };
  }, [monthPayments, typedTeamPayments, projectCosts]);

  // Calculate total payable including team and extra costs for summary
  const totalPayableWithExtras = useMemo(() => {
    const basePayable = summaries.totalPayable;
    
    const teamTotal = typedTeamPayments
      .filter(tp => tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    
    const custosExtras = projectCosts
      .filter(p => p.custos_extras_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.custos_extras || 0), 0);
    
    return basePayable + teamTotal + custosExtras;
  }, [summaries.totalPayable, typedTeamPayments, projectCosts]);

  // Projects available for invoicing
  const invoiceableProjects = useMemo(() => {
    return projects.filter(p => p.agreed_value && p.agreed_value > 0);
  }, [projects]);

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectedTotal = useMemo(() => {
    return invoiceableProjects
      .filter(p => selectedProjects.includes(p.id))
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
  }, [invoiceableProjects, selectedProjects]);

  // Export data for previsão tab
  const previsaoExportData = useMemo(() => {
    return monthPayments.map(payment => ({
      projeto: payment.description || payment.projects?.name || 'Pagamento',
      contraparte: payment.clients?.name || payment.freelancer_name || 'N/A',
      vencimento: payment.due_date 
        ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt })
        : '-',
      status: statusLabels[payment.status] || payment.status,
      valor: `${payment.is_receivable ? '+' : '-'}${formatCurrency(payment.amount)}`,
    }));
  }, [monthPayments, formatCurrency]);

  // Forecast summary for export
  const forecastSummary = useMemo(() => ({
    receivable: formatCurrency(monthlyForecast.receivable),
    totalPayable: formatCurrency(monthlyForecast.totalPayable),
    net: formatCurrency(monthlyForecast.net),
    teamTotal: formatCurrency(monthlyForecast.teamTotal),
    teamCaptacao: formatCurrency(monthlyForecast.teamCaptacao),
    teamEdicao: formatCurrency(monthlyForecast.teamEdicao),
    custosExtras: formatCurrency(monthlyForecast.custosExtras),
    payable: formatCurrency(monthlyForecast.payable),
    month: format(currentMonth, 'MMMM yyyy', { locale: pt }),
  }), [monthlyForecast, currentMonth, formatCurrency]);

  // Handle client payment status change
  const handleClientStatusChange = async (paymentId: string, newStatus: string) => {
    await updatePaymentStatus(paymentId, newStatus);
  };

  // Handle freelancer payment status change
  const handleFreelancerStatusChange = async (teamId: string, newStatus: string) => {
    await updateTeamPaymentStatus(teamId, newStatus);
  };

  // Handle extra costs status change
  const handleCostStatusChange = async (projectId: string, newStatus: string) => {
    await supabase
      .from('projects')
      .update({ custos_extras_payment_status: newStatus })
      .eq('id', projectId);
    
    // Refresh data
    const { data: costsData } = await supabase
      .from('projects')
      .select('id, name, custos_extras, custos_extras_payment_status')
      .eq('workspace_id', currentWorkspace?.id)
      .gt('custos_extras', 0);
    
    if (costsData) {
      setAllProjectCosts(costsData as ProjectCustoExtra[]);
      setProjectCosts(costsData.filter(c => 
        c.custos_extras_payment_status === 'pendente' || 
        c.custos_extras_payment_status === 'vencido' || 
        c.custos_extras_payment_status === null
      ) as ProjectCustoExtra[]);
    }
    
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  // Prepare clients list for filters
  const clientsList = useMemo(() => {
    return clients.map(c => ({ id: c.id, name: c.name }));
  }, [clients]);

  // Prepare members list for filters
  const membersList = useMemo(() => {
    return members.map(m => ({ user_id: m.user_id, full_name: m.full_name }));
  }, [members]);

  // Prepare projects list for freelancer component
  const projectsList = useMemo(() => {
    return projects.map(p => ({ id: p.id, name: p.name, project_code: p.project_code }));
  }, [projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Visualizador não pode ver pagamentos
  if (!canViewOwnFinancials) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Lock className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Não tem permissão para aceder a informação de pagamentos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="text-muted-foreground">
            {canViewAllFinancials 
              ? 'Controle de receitas e despesas' 
              : 'Os seus pagamentos e receitas'}
          </p>
        </div>
      </div>

      {/* Summary Cards - Only for admins */}
      {canViewAllFinancials && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold text-success">{formatCurrency(summaries.totalReceivable)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">A Receber</p>
              <p className="text-xs text-muted-foreground/70">Total pendente</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold text-destructive">{formatCurrency(totalPayableWithExtras)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">A Pagar</p>
              <p className="text-xs text-muted-foreground/70">Colaboradores + Custos</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">{formatCurrency(summaries.totalReceived)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Recebido</p>
              <p className="text-xs text-muted-foreground/70">Total recebido</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <AlertCircle className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold">{summaries.overdue}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Vencidos</p>
              <p className="text-xs text-muted-foreground/70">Pagamentos atrasados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs - Limit tabs for non-admins */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="previsao">
            {canViewAllFinancials ? 'Previsão' : 'Meus Pagamentos'}
          </TabsTrigger>
          {canViewAllFinancials && (
            <>
              <TabsTrigger value="clientes">Pag. Clientes</TabsTrigger>
              <TabsTrigger value="colaboradores">Pag. Colaboradores</TabsTrigger>
              <TabsTrigger value="custos-extras">Custos Extras</TabsTrigger>
              <TabsTrigger value="faturas" disabled className="opacity-50">
                Emitir Fatura
                <span className="ml-1 text-[10px] text-muted-foreground">(brevemente)</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Previsão Tab */}
        <TabsContent value="previsao" className="space-y-6">
          {/* Month Navigator with Export */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="min-w-[140px]">
                {format(currentMonth, 'MMMM yyyy', { locale: pt })}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <PaymentExportButtons
              data={previsaoExportData}
              filename={`previsao-${format(currentMonth, 'yyyy-MM')}`}
              type="previsao"
              forecastSummary={forecastSummary}
            />
          </div>

          {/* Monthly Forecast */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="glass-card border-success/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Previsão de Entrada</p>
                <p className="text-3xl font-bold text-success">{formatCurrency(monthlyForecast.receivable)}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Pagamentos de clientes</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-destructive/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Previsão de Saída</p>
                <p className="text-3xl font-bold text-destructive">{formatCurrency(monthlyForecast.totalPayable)}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Colaboradores + Custos</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-primary/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Saldo Previsto</p>
                <p className={cn('text-3xl font-bold', monthlyForecast.net >= 0 ? 'text-success' : 'text-destructive')}>
                  {formatCurrency(monthlyForecast.net)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Empty State for Month */}
          {monthPayments.length === 0 && (
            <Card className="glass-card">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Sem pagamentos neste mês</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Não há pagamentos registados para {format(currentMonth, 'MMMM yyyy', { locale: pt })}. Os pagamentos serão exibidos quando tiver projetos com valores definidos.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown of Payable */}
          {(monthlyForecast.teamTotal > 0 || monthlyForecast.custosExtras > 0) && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Detalhes de Saídas Previstas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Collaborator Payments */}
                {monthlyForecast.teamTotal > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">A Pagar Colaboradores</span>
                      </div>
                      <span className="font-bold text-destructive">{formatCurrency(monthlyForecast.teamTotal)}</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Captação</span>
                        <span>{formatCurrency(monthlyForecast.teamCaptacao)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Edição</span>
                        <span>{formatCurrency(monthlyForecast.teamEdicao)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Extra Costs */}
                {monthlyForecast.custosExtras > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Custos Extras</span>
                    </div>
                    <span className="font-bold text-destructive">{formatCurrency(monthlyForecast.custosExtras)}</span>
                  </div>
                )}
                
                {/* Other payments */}
                {monthlyForecast.payable > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Outros Pagamentos</span>
                    </div>
                    <span className="font-bold text-destructive">{formatCurrency(monthlyForecast.payable)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Month Payments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Movimentos do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {monthPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum pagamento previsto para este mês
                </p>
              ) : (
                <div className="space-y-3">
                  {monthPayments.map(payment => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          payment.is_receivable ? 'bg-success/10' : 'bg-destructive/10'
                        )}>
                          {payment.is_receivable ? (
                            <TrendingUp className="h-5 w-5 text-success" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{payment.description || payment.projects?.name || 'Pagamento'}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.clients?.name || payment.freelancer_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn(statusColors[payment.status])}>
                          {statusLabels[payment.status]}
                        </Badge>
                        <span className={cn(
                          'font-medium',
                          payment.is_receivable ? 'text-success' : 'text-destructive'
                        )}>
                          {payment.is_receivable ? '+' : '-'}{formatCurrency(payment.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pagamentos Clientes Tab */}
        <TabsContent value="clientes" className="space-y-6">
          <ClientPaymentsControl
            payments={payments}
            clients={clientsList}
            projects={projectsList}
            onStatusChange={handleClientStatusChange}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        {/* Pagamentos Colaboradores Tab */}
        <TabsContent value="colaboradores" className="space-y-6">
          <FreelancerPaymentsControl
            teamPayments={typedTeamPayments}
            projects={projectsList}
            members={membersList}
            onStatusChange={handleFreelancerStatusChange}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        {/* Custos Extras Tab */}
        <TabsContent value="custos-extras" className="space-y-6">
          <ExtraCostsPaymentsControl
            projectCosts={allProjectCosts}
            onStatusChange={handleCostStatusChange}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        {/* Faturas Tab */}
        <TabsContent value="faturas" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Selecionar Projetos para Faturação</CardTitle>
            </CardHeader>
            <CardContent>
              {invoiceableProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum projeto com valor definido para faturar
                </p>
              ) : (
                <div className="space-y-2">
                  {invoiceableProjects.map(project => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                        />
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.project_code || project.id.slice(0, 8)} • {project.clients?.name || 'Sem cliente'}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium">{formatCurrency(project.agreed_value || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Actions */}
          {selectedProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card border-primary/20">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{selectedProjects.length} projeto(s) selecionado(s)</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(selectedTotal)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Exportar Excel
                      </Button>
                      <Button className="gradient-primary">
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
      
      <UpgradeAlert
        isOpen={upgradeAlert.isOpen}
        onClose={closeUpgradeAlert}
        feature={upgradeAlert.feature}
        requiredPlan={upgradeAlert.requiredPlan}
      />
    </div>
  );
}
