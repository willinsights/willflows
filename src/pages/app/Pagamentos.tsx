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
  Euro,
  Eye,
  EyeOff,
  Calendar,
  Wallet,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePayments, useTeamPayments } from '@/hooks/usePayments';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useHideValues } from '@/hooks/useHideValues';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ClientPaymentsControl } from '@/components/payments/ClientPaymentsControl';
import { FreelancerPaymentsControl, type ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';
import { PaymentExportButtons } from '@/components/payments/PaymentExportButtons';
import { ExtraCostsPaymentsControl, type ProjectCustoExtra } from '@/components/payments/ExtraCostsPaymentsControl';
import { ProjectRevenueControl, type ProjectRevenue } from '@/components/payments/ProjectRevenueControl';
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

type PaymentViewMode = 'vencimento' | 'pagamento';

export default function Pagamentos() {
  const { payments, loading, summaries, updatePaymentStatus } = usePayments();
  const { teamPayments, updateTeamPaymentStatus } = useTeamPayments();
  const { projects } = useProjects();
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const { members } = useWorkspaceMembers();
  const { canViewAllFinancials, canViewOwnFinancials, userId, userRole, isCollaborator, isLoading: permissionsLoading } = useFinancialPermissions();
  const { hasFeatureAccess, checkFeature, upgradeAlert, closeUpgradeAlert, getFeatureInfo, getUpgradePlan } = usePlanFeatures();
  const { hideValues, toggleHideValues } = useHideValues();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('previsao');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [paymentViewMode, setPaymentViewMode] = useState<PaymentViewMode>('vencimento');
  
  const canExportPdf = hasFeatureAccess('exportPdf');
  
  // Data for extra costs
  const [projectCosts, setProjectCosts] = useState<ProjectCustoExtra[]>([]);
  const [allProjectCosts, setAllProjectCosts] = useState<ProjectCustoExtra[]>([]);
  const [projectRevenue, setProjectRevenue] = useState<ProjectRevenue[]>([]);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Fetch project extra costs and revenue data
  useEffect(() => {
    const fetchAdditionalData = async () => {
      if (!currentWorkspace?.id) return;
      
      const { data: costsData } = await supabase
        .from('projects')
        .select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, delivery_date, delivered_at, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .gt('custos_extras', 0)
        .in('custos_extras_payment_status', ['pendente', 'vencido', null]);
      
      if (costsData) {
        setProjectCosts(costsData as ProjectCustoExtra[]);
      }
      
      const { data: allCostsData } = await supabase
        .from('projects')
        .select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, delivery_date, delivered_at, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .gt('custos_extras', 0);
      
      if (allCostsData) {
        setAllProjectCosts(allCostsData as ProjectCustoExtra[]);
      }

      const { data: revenueData } = await supabase
        .from('projects')
        .select('id, name, project_code, agreed_value, client_payment_status, client_payment_due_date, client_id, delivery_date, delivered_at, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .gt('agreed_value', 0);
      
      if (revenueData) {
        setProjectRevenue(revenueData as ProjectRevenue[]);
      }
    };
    
    fetchAdditionalData();
  }, [currentWorkspace?.id]);

  // Filter projects for current month view
  const monthProjectRevenue = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    return projectRevenue.filter(project => {
      const dateToCheck = project.client_payment_due_date || project.delivery_date || project.delivered_at;
      
      if (!dateToCheck) {
        return false;
      }
      
      const date = new Date(dateToCheck);
      return isWithinInterval(date, { start, end });
    });
  }, [projectRevenue, currentMonth]);

  // Filter payments for the current month view
  const monthPayments = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    let filteredPayments = payments.filter(payment => {
      if (!payment.due_date) return false;
      const dueDate = new Date(payment.due_date);
      return isWithinInterval(dueDate, { start, end });
    });

    if (!canViewAllFinancials && userId) {
      filteredPayments = filteredPayments.filter(p => 
        p.is_receivable && p.collaborator_id === userId
      );
    }

    return filteredPayments;
  }, [payments, currentMonth, canViewAllFinancials, userId]);

  const typedTeamPayments = teamPayments as ProjectTeamPayment[];

  // Calculate monthly forecasts
  const monthlyForecast = useMemo(() => {
    const totalReceivable = monthProjectRevenue.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const alreadyReceived = monthProjectRevenue
      .filter(p => p.client_payment_status === 'pago')
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const pendingReceivable = monthProjectRevenue
      .filter(p => p.client_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    
    const payable = monthPayments.filter(p => !p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0);
    
    const teamCaptacao = typedTeamPayments
      .filter(tp => tp.phase === 'captacao' && tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    
    const teamEdicao = typedTeamPayments
      .filter(tp => tp.phase === 'edicao' && tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    
    const teamTotal = teamCaptacao + teamEdicao;
    
    const custosExtras = projectCosts
      .filter(p => p.custos_extras_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.custos_extras || 0), 0);
    
    const totalPayable = payable + teamTotal + custosExtras;

    const lucroPrevisto = pendingReceivable - totalPayable;
    const margemPercent = pendingReceivable > 0 
      ? Math.round((lucroPrevisto / pendingReceivable) * 100)
      : 0;
    
    return { 
      totalReceivable,
      alreadyReceived,
      pendingReceivable,
      receivable: pendingReceivable,
      payable, 
      teamTotal,
      teamCaptacao,
      teamEdicao,
      custosExtras,
      totalPayable,
      net: pendingReceivable - totalPayable,
      lucroPrevisto,
      margemPercent,
    };
  }, [monthProjectRevenue, monthPayments, typedTeamPayments, projectCosts]);

  // Global summary stats (all-time)
  const globalSummary = useMemo(() => {
    const totalDueReceivable = projectRevenue
      .filter(p => p.client_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const totalPaidReceivable = projectRevenue
      .filter(p => p.client_payment_status === 'pago')
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);

    const teamPending = typedTeamPayments
      .filter(tp => tp.payment_status !== 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    const teamPaid = typedTeamPayments
      .filter(tp => tp.payment_status === 'pago')
      .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    const extrasPending = projectCosts
      .filter(p => (p.custos_extras_payment_status || 'pendente') !== 'pago')
      .reduce((sum, p) => sum + (p.custos_extras || 0), 0);
    const extrasPaid = allProjectCosts
      .filter(p => p.custos_extras_payment_status === 'pago')
      .reduce((sum, p) => sum + (p.custos_extras || 0), 0);

    const totalDuePayable = teamPending + extrasPending;
    const totalPaidPayable = teamPaid + extrasPaid;

    const overdueReceivable = projectRevenue.filter(p => p.client_payment_status === 'vencido');
    const overduePayable = typedTeamPayments.filter(tp => tp.payment_status === 'vencido');

    const overdueCount = overdueReceivable.length + overduePayable.length;
    const overdueAmount = overdueReceivable.reduce((s, p) => s + (p.agreed_value || 0), 0)
      + overduePayable.reduce((s, tp) => s + (tp.payment_amount || 0), 0);

    return {
      totalDueReceivable,
      totalPaidReceivable,
      totalDuePayable,
      totalPaidPayable,
      overdueCount,
      overdueAmount,
    };
  }, [projectRevenue, typedTeamPayments, projectCosts, allProjectCosts]);

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
    const revenueData = monthProjectRevenue.map(project => ({
      id: project.project_code || project.id.slice(0, 8).toUpperCase(),
      projeto: project.name,
      contraparte: project.clients?.name || 'Cliente',
      tipo: 'Receita Cliente',
      vencimento: project.client_payment_due_date 
        ? format(new Date(project.client_payment_due_date), 'dd/MM/yyyy', { locale: pt })
        : project.delivery_date
          ? format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })
          : '-',
      status: statusLabels[project.client_payment_status || 'pendente'],
      valor: `+${formatCurrency(project.agreed_value || 0)}`,
    }));

    const paymentsData = monthPayments.map(payment => ({
      id: payment.id.slice(0, 8).toUpperCase(),
      projeto: payment.description || payment.projects?.name || 'Pagamento',
      contraparte: payment.clients?.name || payment.freelancer_name || 'N/A',
      tipo: payment.is_receivable ? 'Outro Recebimento' : 'Pagamento',
      vencimento: payment.due_date 
        ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt })
        : '-',
      status: statusLabels[payment.status] || payment.status,
      valor: `${payment.is_receivable ? '+' : '-'}${formatCurrency(payment.amount)}`,
    }));

    return [...revenueData, ...paymentsData];
  }, [monthProjectRevenue, monthPayments, formatCurrency]);

  const forecastSummary = useMemo(() => ({
    totalReceivable: formatCurrency(monthlyForecast.totalReceivable),
    alreadyReceived: formatCurrency(monthlyForecast.alreadyReceived),
    pendingReceivable: formatCurrency(monthlyForecast.pendingReceivable),
    receivable: formatCurrency(monthlyForecast.pendingReceivable),
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

  // Handle freelancer payment status change (Fase 7: set/clear paid_at)
  const handleFreelancerStatusChange = async (teamId: string, newStatus: string) => {
    // The DB trigger handles paid_at auto-fill, but we also set it explicitly for immediate consistency
    const updates: Record<string, unknown> = {
      payment_status: newStatus,
    };
    if (newStatus === 'pago') {
      updates.paid_at = new Date().toISOString();
    } else {
      updates.paid_at = null;
    }

    await supabase
      .from('project_team')
      .update(updates)
      .eq('id', teamId);

    queryClient.invalidateQueries({ queryKey: ['team-payments'] });
  };

  // Handle extra costs status change (Fase 7: set/clear custos_extras_paid_at)
  const handleCostStatusChange = async (projectId: string, newStatus: string) => {
    const updates: Record<string, unknown> = {
      custos_extras_payment_status: newStatus,
    };
    if (newStatus === 'pago') {
      updates.custos_extras_paid_at = new Date().toISOString();
    } else {
      updates.custos_extras_paid_at = null;
    }

    await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);
    
    // Refresh data
    const { data: costsData } = await supabase
      .from('projects')
      .select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, delivery_date, clients(name)')
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

  // Handle project revenue status change
  const handleProjectRevenueStatusChange = async (projectId: string, newStatus: string) => {
    const updates: Record<string, unknown> = {
      client_payment_status: newStatus,
    };
    
    if (newStatus === 'pago') {
      updates.client_paid_at = new Date().toISOString();
    } else {
      updates.client_paid_at = null;
    }
    
    await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);
    
    const { data: revenueData } = await supabase
      .from('projects')
      .select('id, name, project_code, agreed_value, client_payment_status, client_payment_due_date, client_id, delivery_date, clients(name)')
      .eq('workspace_id', currentWorkspace?.id)
      .gt('agreed_value', 0);
    
    if (revenueData) {
      setProjectRevenue(revenueData as ProjectRevenue[]);
    }
    
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const clientsList = useMemo(() => {
    return clients.map(c => ({ id: c.id, name: c.name }));
  }, [clients]);

  const membersList = useMemo(() => {
    return members.map(m => ({ user_id: m.user_id, full_name: m.full_name }));
  }, [members]);

  const projectsList = useMemo(() => {
    return projects.map(p => ({ id: p.id, name: p.name, project_code: p.project_code, client_id: p.client_id, delivery_date: p.delivery_date, delivered_at: p.delivered_at, is_delivered: p.is_delivered }));
  }, [projects]);

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          {/* Payment View Mode Toggle */}
          {canViewAllFinancials && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={paymentViewMode === 'vencimento' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setPaymentViewMode('vencimento')}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Por Vencimento
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Agrupa por data de vencimento (due_date / delivery_date)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={paymentViewMode === 'pagamento' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setPaymentViewMode('pagamento')}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Por Pagamento
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Agrupa por data de pagamento efectivo (paid_at)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleHideValues} className="h-9 w-9">
            {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Fixed Summary Cards - Global Overview */}
      {canViewAllFinancials && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="glass-card border-success/20">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">A Receber</p>
              <p className={cn("text-lg font-bold text-success", hideValues && "blur-md select-none")}>
                {formatCurrency(globalSummary.totalDueReceivable)}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card border-success/30 bg-success/5">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recebido</p>
              <p className={cn("text-lg font-bold text-success/80", hideValues && "blur-md select-none")}>
                {formatCurrency(globalSummary.totalPaidReceivable)}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card border-destructive/20">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">A Pagar</p>
              <p className={cn("text-lg font-bold text-destructive", hideValues && "blur-md select-none")}>
                {formatCurrency(globalSummary.totalDuePayable)}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card border-destructive/30 bg-destructive/5">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pago</p>
              <p className={cn("text-lg font-bold text-destructive/80", hideValues && "blur-md select-none")}>
                {formatCurrency(globalSummary.totalPaidPayable)}
              </p>
            </CardContent>
          </Card>
          <Card className={cn("glass-card", globalSummary.overdueCount > 0 ? "border-warning/30 bg-warning/5" : "")}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Atrasados</p>
              <p className="text-lg font-bold text-warning">{globalSummary.overdueCount}</p>
            </CardContent>
          </Card>
          <Card className={cn("glass-card", globalSummary.overdueCount > 0 ? "border-warning/20" : "")}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor Atraso</p>
              <p className={cn("text-lg font-bold text-warning", hideValues && "blur-md select-none")}>
                {formatCurrency(globalSummary.overdueAmount)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="previsao">
            {!canViewAllFinancials ? 'Meus Pagamentos' : 'Previsão'}
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
          {!canViewAllFinancials ? (
            <FreelancerPaymentsControl
              teamPayments={typedTeamPayments}
              onStatusChange={handleFreelancerStatusChange}
              formatCurrency={formatCurrency}
              members={membersList}
              projects={projectsList}
              filterByUserId={userId}
            />
          ) : (
            <>
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

              {/* Monthly Financial Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-card border-success/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Receita Total</p>
                    <p className={cn("text-2xl font-bold text-success", hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.totalReceivable)}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Todos os pagamentos</p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-success/30 bg-success/5">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      <p className="text-xs text-muted-foreground">Já Recebido</p>
                    </div>
                    <p className={cn("text-2xl font-bold text-success/80", hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.alreadyReceived)}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Status: Pago</p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-warning/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Por Receber</p>
                    <p className={cn("text-2xl font-bold text-warning", hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.pendingReceivable)}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Pendentes + Vencidos</p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-destructive/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total a Pagar</p>
                    <p className={cn("text-2xl font-bold text-destructive", hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.totalPayable)}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Colaboradores + Custos</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Net Balance Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass-card border-primary/20">
                  <CardContent className="py-4 px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Saldo Líquido Previsto</p>
                        <p className="text-xs text-muted-foreground/70">Por Receber - Total a Pagar</p>
                      </div>
                      <p className={cn('text-3xl font-bold', monthlyForecast.net >= 0 ? 'text-success' : 'text-destructive', hideValues && "blur-md select-none")}>
                        {monthlyForecast.net >= 0 ? '+' : ''}{formatCurrency(monthlyForecast.net)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-primary/30 bg-primary/5">
                  <CardContent className="py-4 px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Lucro Previsto</p>
                        <p className="text-xs text-muted-foreground/70">Margem: {monthlyForecast.margemPercent}%</p>
                      </div>
                      <p className={cn('text-3xl font-bold', monthlyForecast.lucroPrevisto >= 0 ? 'text-primary' : 'text-destructive', hideValues && "blur-md select-none")}>
                        {monthlyForecast.lucroPrevisto >= 0 ? '+' : ''}{formatCurrency(monthlyForecast.lucroPrevisto)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Empty State */}
              {monthPayments.length === 0 && monthProjectRevenue.length === 0 && (
                <Card className="glass-card">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <CreditCard className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Sem pagamentos neste mês</h3>
                      <p className="text-muted-foreground text-sm max-w-sm">
                        Não há pagamentos registados para {format(currentMonth, 'MMMM yyyy', { locale: pt })}.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Project Revenue Section */}
              {monthProjectRevenue.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Euro className="h-5 w-5 text-success" />
                      Receita de Clientes (Preço Projeto)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {monthProjectRevenue.map(project => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/10">
                              <TrendingUp className="h-5 w-5 text-success" />
                            </div>
                            <div>
                              <p className="font-medium">{project.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {project.clients?.name || 'Cliente'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={cn(statusColors[project.client_payment_status || 'pendente'])}>
                              {statusLabels[project.client_payment_status || 'pendente']}
                            </Badge>
                            <span className={cn("font-medium text-success", hideValues && "blur-md select-none")}>
                              +{formatCurrency(project.agreed_value || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
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
                    {monthlyForecast.teamTotal > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">A Pagar Colaboradores</span>
                          </div>
                          <span className={cn("font-bold text-destructive", hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.teamTotal)}</span>
                        </div>
                        <div className="ml-6 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Captação</span>
                            <span className={cn(hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.teamCaptacao)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Edição</span>
                            <span className={cn(hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.teamEdicao)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {monthlyForecast.custosExtras > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Custos Extras</span>
                        </div>
                        <span className={cn("font-bold text-destructive", hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.custosExtras)}</span>
                      </div>
                    )}
                    
                    {monthlyForecast.payable > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Outros Pagamentos</span>
                        </div>
                        <span className={cn("font-bold text-destructive", hideValues && "blur-md select-none")}>{formatCurrency(monthlyForecast.payable)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Other Month Payments */}
              {monthPayments.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Outros Movimentos</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                              payment.is_receivable ? 'text-success' : 'text-destructive',
                              hideValues && "blur-md select-none"
                            )}>
                              {payment.is_receivable ? '+' : '-'}{formatCurrency(payment.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Receita de Projetos Tab */}
        <TabsContent value="clientes" className="space-y-6">
          <ProjectRevenueControl
            projects={projectRevenue}
            clients={clientsList}
            onStatusChange={handleProjectRevenueStatusChange}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        {/* Pagamentos Colaboradores Tab */}
        <TabsContent value="colaboradores" className="space-y-6">
          <FreelancerPaymentsControl
            teamPayments={typedTeamPayments}
            projects={projectsList}
            members={membersList}
            clients={clientsList}
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
                      <span className={cn("font-medium", hideValues && "blur-md select-none")}>{formatCurrency(project.agreed_value || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
                      <p className={cn("text-2xl font-bold text-primary", hideValues && "blur-md select-none")}>{formatCurrency(selectedTotal)}</p>
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
