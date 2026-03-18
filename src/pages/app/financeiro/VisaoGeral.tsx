import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  CreditCard, TrendingUp, TrendingDown, CheckCircle2,
  ChevronLeft, ChevronRight, Users, Package, Euro, Calendar, Wallet,
  BarChart3, Activity, Banknote,
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
import { useFinancialEngine } from '@/hooks/useFinancialEngine';
import { FreelancerPaymentsControl, type ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';
import { PaymentExportButtons } from '@/components/payments/PaymentExportButtons';
import { paymentStatusLabels as statusLabels, paymentStatusColors as statusColors } from '@/lib/finance/constants';
import { cn } from '@/lib/utils';
import type { FinancialViewMode } from '@/lib/finance/types';

const viewModeConfig: { value: FinancialViewMode; label: string; icon: typeof Euro; description: string }[] = [
  { value: 'PREVISAO', label: 'Previsão', icon: Activity, description: 'Baseado na data de entrega/captação' },
  { value: 'REALIZADO', label: 'Realizado', icon: CheckCircle2, description: 'Projetos efetivamente entregues (competência)' },
  { value: 'CAIXA', label: 'Caixa', icon: Banknote, description: 'Fluxo real: datas de pagamento efetivo' },
];

export default function VisaoGeral() {
  const { payments } = usePayments();
  const { teamPayments } = useTeamPayments();
  const { projects } = useProjects();
  const { members } = useWorkspaceMembers();
  const { canViewAllFinancials, userId } = useFinancialPermissions();
  const { hideValues } = useHideValues();
  const { formatCurrency } = useFormatCurrency();
  const { projectRevenue, handleFreelancerStatusChange } = usePaymentsData();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<FinancialViewMode>('PREVISAO');

  const typedTeamPayments = teamPayments as ProjectTeamPayment[];

  // Use the unified financial engine for metrics
  const { metrics, previousMetrics, revenueChange, costChange, profitChange, summary } = useFinancialEngine(viewMode, currentMonth);

  // Revenue detail list for current month (by due date / delivery)
  const monthProjectRevenue = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return projectRevenue.filter(project => {
      const dateToCheck = project.client_payment_due_date || project.delivery_date || project.delivered_at;
      if (!dateToCheck) return false;
      return isWithinInterval(new Date(dateToCheck), { start, end });
    });
  }, [projectRevenue, currentMonth]);

  // Legacy payments (Outros Movimentos)
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

  const margin = metrics.revenue > 0 ? Math.round((metrics.profit / metrics.revenue) * 100) : 0;

  // Export data
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
    totalReceivable: formatCurrency(metrics.revenue),
    alreadyReceived: '—',
    pendingReceivable: formatCurrency(metrics.revenue),
    receivable: formatCurrency(metrics.revenue),
    totalPayable: formatCurrency(metrics.cost),
    net: formatCurrency(metrics.profit),
    teamTotal: '—',
    teamCaptacao: '—',
    teamEdicao: '—',
    custosExtras: '—',
    payable: '—',
    month: format(currentMonth, 'MMMM yyyy', { locale: pt }),
  }), [metrics, currentMonth, formatCurrency]);

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
      {/* Controls: View Mode + Month Navigator + Export */}
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
            {viewModeConfig.map(mode => (
              <Tooltip key={mode.value}>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === mode.value ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setViewMode(mode.value)}
                  >
                    <mode.icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">{mode.description}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>
          <PaymentExportButtons
            data={previsaoExportData}
            filename={`financeiro-${viewMode.toLowerCase()}-${format(currentMonth, 'yyyy-MM')}`}
            type="previsao"
            forecastSummary={forecastSummary}
          />
        </div>
      </div>

      {/* Summary Cards from Engine */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Receita', borderClass: 'border-success/20',
            valueClass: 'text-success',
            value: formatCurrency(metrics.revenue),
            change: revenueChange, changePositiveGood: true,
          },
          {
            label: 'Custos', borderClass: 'border-destructive/20',
            valueClass: 'text-destructive',
            value: formatCurrency(metrics.cost),
            change: costChange, changePositiveGood: false,
          },
          {
            label: 'Lucro', borderClass: 'border-primary/20',
            valueClass: metrics.profit >= 0 ? 'text-primary' : 'text-destructive',
            value: `${metrics.profit >= 0 ? '+' : ''}${formatCurrency(metrics.profit)}`,
            change: profitChange, changePositiveGood: true,
          },
          {
            label: 'Margem', borderClass: 'border-muted',
            valueClass: margin >= 30 ? 'text-success' : margin >= 0 ? 'text-warning' : 'text-destructive',
            value: `${margin}%`,
            change: null, changePositiveGood: true,
            sub: `${metrics.projectCount} projeto${metrics.projectCount !== 1 ? 's' : ''}`,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
          >
            <Card className={cn("glass-card hover:shadow-md transition-shadow", card.borderClass)}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className={cn("text-2xl font-bold", card.valueClass, hideValues && "blur-md select-none")}>
                  {card.value}
                </p>
                {card.change !== null && (
                  <p className={cn("text-[10px] mt-1", 
                    card.changePositiveGood 
                      ? (card.change >= 0 ? "text-success" : "text-destructive")
                      : (card.change <= 0 ? "text-success" : "text-destructive")
                  )}>
                    {card.change >= 0 ? '▲' : '▼'} {Math.abs(card.change)}% vs mês anterior
                  </p>
                )}
                {card.sub && (
                  <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* PREVISAO Breakdown (rollover info) */}
      {viewMode === 'PREVISAO' && metrics.breakdown && (metrics.breakdown.rolloverCount > 0) && (
        <Card className="glass-card border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Rollover de meses anteriores</span>
              <Badge variant="outline" className="text-warning border-warning/30">{metrics.breakdown.rolloverCount} projeto{metrics.breakdown.rolloverCount !== 1 ? 's' : ''}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Receita rollover</span>
                <span className={cn("font-medium", hideValues && "blur-md select-none")}>{formatCurrency(metrics.breakdown.rolloverRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Custos rollover</span>
                <span className={cn("font-medium", hideValues && "blur-md select-none")}>{formatCurrency(metrics.breakdown.rolloverCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CAIXA Breakdown */}
      {viewMode === 'CAIXA' && metrics.cashflow && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Detalhe do Fluxo de Caixa</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-success" />
                  <span>Recebimentos de clientes</span>
                </div>
                <span className={cn("font-medium text-success", hideValues && "blur-md select-none")}>+{formatCurrency(metrics.cashflow.clientIncome)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-destructive" />
                  <span>Pagamentos a equipa</span>
                </div>
                <span className={cn("font-medium text-destructive", hideValues && "blur-md select-none")}>-{formatCurrency(metrics.cashflow.teamExpenses)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-destructive" />
                  <span>Custos extras</span>
                </div>
                <span className={cn("font-medium text-destructive", hideValues && "blur-md select-none")}>-{formatCurrency(metrics.cashflow.extrasExpenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary (operational) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Criados', value: summary.created, color: 'text-muted-foreground' },
          { label: 'Planeados', value: summary.planned, color: 'text-primary' },
          { label: 'Entregues', value: summary.delivered, color: 'text-success' },
          { label: 'Adiados', value: summary.postponed, color: 'text-warning' },
          { label: 'Resgatados', value: summary.rescued, color: 'text-primary' },
        ].map(item => (
          <Card key={item.label} className="glass-card">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
              <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {monthPayments.length === 0 && monthProjectRevenue.length === 0 && metrics.projectCount === 0 && (
        <Card className="glass-card">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sem dados neste mês</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Não há movimentos para {format(currentMonth, 'MMMM yyyy', { locale: pt })}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Revenue Detail */}
      {monthProjectRevenue.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Euro className="h-5 w-5 text-success" />
              Receita de Clientes
              <Badge variant="secondary" className="ml-auto">{monthProjectRevenue.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthProjectRevenue.map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-success/10 shrink-0">
                      <TrendingUp className="h-4 w-4 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{project.clients?.name || 'Cliente'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("text-[10px]", statusColors[project.client_payment_status || 'pendente'])}>
                      {statusLabels[project.client_payment_status || 'pendente']}
                    </Badge>
                    <span className={cn("font-medium text-sm text-success", hideValues && "blur-md select-none")}>
                      +{formatCurrency(project.agreed_value || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Payments (Legacy) */}
      {monthPayments.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Outros Movimentos
              <Badge variant="secondary" className="ml-auto">{monthPayments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthPayments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', payment.is_receivable ? 'bg-success/10' : 'bg-destructive/10')}>
                      {payment.is_receivable ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{payment.description || payment.projects?.name || 'Pagamento'}</p>
                      <p className="text-xs text-muted-foreground truncate">{payment.clients?.name || payment.freelancer_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("text-[10px]", statusColors[payment.status])}>
                      {statusLabels[payment.status]}
                    </Badge>
                    <span className={cn('font-medium text-sm', payment.is_receivable ? 'text-success' : 'text-destructive', hideValues && "blur-md select-none")}>
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
