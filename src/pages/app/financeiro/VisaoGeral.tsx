import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  CreditCard, TrendingUp, TrendingDown, CheckCircle2,
  ChevronLeft, ChevronRight, Users, Package, Euro, Calendar, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePayments, useTeamPayments } from '@/hooks/usePayments';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useHideValues } from '@/hooks/useHideValues';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useProjects } from '@/hooks/useProjects';
import { FreelancerPaymentsControl, type ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';
import { PaymentExportButtons } from '@/components/payments/PaymentExportButtons';
import { paymentStatusLabels as statusLabels, paymentStatusColors as statusColors } from '@/lib/finance/constants';
import { cn } from '@/lib/utils';

type PaymentViewMode = 'vencimento' | 'pagamento';

export default function VisaoGeral() {
  const { payments, updatePaymentStatus } = usePayments();
  const { teamPayments } = useTeamPayments();
  const { projects } = useProjects();
  const { members } = useWorkspaceMembers();
  const { canViewAllFinancials, userId } = useFinancialPermissions();
  const { hideValues } = useHideValues();
  const { formatCurrency } = useFormatCurrency();
  const { projectCosts, projectRevenue, handleFreelancerStatusChange } = usePaymentsData();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [paymentViewMode, setPaymentViewMode] = useState<PaymentViewMode>('vencimento');

  const typedTeamPayments = teamPayments as ProjectTeamPayment[];

  const monthProjectRevenue = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return projectRevenue.filter(project => {
      const dateToCheck = project.client_payment_due_date || project.delivery_date || project.delivered_at;
      if (!dateToCheck) return false;
      return isWithinInterval(new Date(dateToCheck), { start, end });
    });
  }, [projectRevenue, currentMonth]);

  const monthPayments = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    let filtered = payments.filter(payment => {
      if (!payment.due_date) return false;
      return isWithinInterval(new Date(payment.due_date), { start, end });
    });
    if (!canViewAllFinancials && userId) {
      filtered = filtered.filter(p => p.is_receivable && p.collaborator_id === userId);
    }
    return filtered;
  }, [payments, currentMonth, canViewAllFinancials, userId]);

  const monthlyForecast = useMemo(() => {
    const totalReceivable = monthProjectRevenue.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const alreadyReceived = monthProjectRevenue
      .filter(p => p.client_payment_status === 'pago')
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const pendingReceivable = monthProjectRevenue
      .filter(p => p.client_payment_status !== 'pago')
      .reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const payable = monthPayments.filter(p => !p.is_receivable && p.status !== 'pago').reduce((sum, p) => sum + p.amount, 0);
    const teamCaptacao = typedTeamPayments.filter(tp => tp.phase === 'captacao' && tp.payment_status !== 'pago').reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    const teamEdicao = typedTeamPayments.filter(tp => tp.phase === 'edicao' && tp.payment_status !== 'pago').reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);
    const teamTotal = teamCaptacao + teamEdicao;
    const custosExtras = projectCosts.filter(p => p.custos_extras_payment_status !== 'pago').reduce((sum, p) => sum + (p.custos_extras || 0), 0);
    const totalPayable = payable + teamTotal + custosExtras;
    const lucroPrevisto = pendingReceivable - totalPayable;
    const margemPercent = pendingReceivable > 0 ? Math.round((lucroPrevisto / pendingReceivable) * 100) : 0;

    return { totalReceivable, alreadyReceived, pendingReceivable, payable, teamTotal, teamCaptacao, teamEdicao, custosExtras, totalPayable, net: pendingReceivable - totalPayable, lucroPrevisto, margemPercent };
  }, [monthProjectRevenue, monthPayments, typedTeamPayments, projectCosts]);

  const previsaoExportData = useMemo(() => {
    const revenueData = monthProjectRevenue.map(project => ({
      id: project.project_code || project.id.slice(0, 8).toUpperCase(),
      projeto: project.name,
      contraparte: project.clients?.name || 'Cliente',
      tipo: 'Receita Cliente',
      vencimento: project.client_payment_due_date
        ? format(new Date(project.client_payment_due_date), 'dd/MM/yyyy', { locale: pt })
        : project.delivery_date ? format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt }) : '-',
      status: statusLabels[project.client_payment_status || 'pendente'],
      valor: `+${formatCurrency(project.agreed_value || 0)}`,
    }));
    const paymentsData = monthPayments.map(payment => ({
      id: payment.id.slice(0, 8).toUpperCase(),
      projeto: payment.description || payment.projects?.name || 'Pagamento',
      contraparte: payment.clients?.name || payment.freelancer_name || 'N/A',
      tipo: payment.is_receivable ? 'Outro Recebimento' : 'Pagamento',
      vencimento: payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt }) : '-',
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

  const membersList = useMemo(() => members.map(m => ({ user_id: m.user_id, full_name: m.full_name })), [members]);
  const projectsList = useMemo(() => projects.map(p => ({ id: p.id, name: p.name, project_code: p.project_code, client_id: p.client_id, delivery_date: p.delivery_date, delivered_at: p.delivered_at, is_delivered: p.is_delivered })), [projects]);

  // Collaborator-only view
  if (!canViewAllFinancials) {
    return (
      <FreelancerPaymentsControl
        teamPayments={typedTeamPayments}
        onStatusChange={handleFreelancerStatusChange}
        formatCurrency={formatCurrency}
        members={membersList}
        projects={projectsList}
        filterByUserId={userId}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment View Mode + Month Navigator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={paymentViewMode === 'vencimento' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs gap-1.5" onClick={() => setPaymentViewMode('vencimento')}>
                  <Calendar className="h-3.5 w-3.5" />
                  Por Vencimento
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Agrupa por data de vencimento</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={paymentViewMode === 'pagamento' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs gap-1.5" onClick={() => setPaymentViewMode('pagamento')}>
                  <Wallet className="h-3.5 w-3.5" />
                  Por Pagamento
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Agrupa por data de pagamento efectivo</p></TooltipContent>
            </Tooltip>
          </div>
          <PaymentExportButtons
            data={previsaoExportData}
            filename={`previsao-${format(currentMonth, 'yyyy-MM')}`}
            type="previsao"
            forecastSummary={forecastSummary}
          />
        </div>
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

      {/* Net Balance */}
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

      {/* Project Revenue */}
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
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/10">
                      <TrendingUp className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.clients?.name || 'Cliente'}</p>
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

      {/* Other Payments */}
      {monthPayments.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Outros Movimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthPayments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', payment.is_receivable ? 'bg-success/10' : 'bg-destructive/10')}>
                      {payment.is_receivable ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                    </div>
                    <div>
                      <p className="font-medium">{payment.description || payment.projects?.name || 'Pagamento'}</p>
                      <p className="text-sm text-muted-foreground">{payment.clients?.name || payment.freelancer_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn(statusColors[payment.status])}>
                      {statusLabels[payment.status]}
                    </Badge>
                    <span className={cn('font-medium', payment.is_receivable ? 'text-success' : 'text-destructive', hideValues && "blur-md select-none")}>
                      {payment.is_receivable ? '+' : '-'}{formatCurrency(payment.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
