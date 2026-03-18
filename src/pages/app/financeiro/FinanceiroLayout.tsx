import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Euro, TrendingUp, TrendingDown, Package, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { usePayments, useTeamPayments } from '@/hooks/usePayments';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useHideValues } from '@/hooks/useHideValues';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { cn } from '@/lib/utils';
import type { ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';

const subNavItems = [
  { label: 'Visão Geral', path: '/app/financeiro', end: true, icon: Euro },
  { label: 'Receitas', path: '/app/financeiro/receitas', icon: TrendingUp },
  { label: 'Custos Equipa', path: '/app/financeiro/custos', icon: TrendingDown },
  { label: 'Custos Extras', path: '/app/financeiro/custos-extras', icon: Package },
  { label: 'Lucro', path: '/app/financeiro/lucro', icon: BarChart3 },
];

export default function FinanceiroLayout() {
  const { payments, loading } = usePayments();
  const { teamPayments } = useTeamPayments();
  const { canViewAllFinancials, canViewOwnFinancials, isLoading: permissionsLoading } = useFinancialPermissions();
  const { hideValues, toggleHideValues } = useHideValues();
  const { formatCurrency } = useFormatCurrency();
  const { projectCosts, allProjectCosts, projectRevenue } = usePaymentsData();

  const typedTeamPayments = teamPayments as ProjectTeamPayment[];

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

    return { totalDueReceivable, totalPaidReceivable, totalDuePayable, totalPaidPayable, overdueCount, overdueAmount };
  }, [projectRevenue, typedTeamPayments, projectCosts, allProjectCosts]);

  if (loading || permissionsLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-56 hidden sm:block" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <div className="flex gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-[140px] sm:w-auto rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!canViewOwnFinancials) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Lock className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Não tem permissão para aceder a informação financeira.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Finanças</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            {canViewAllFinancials ? 'Controle de receitas e despesas' : 'Os seus pagamentos e receitas'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleHideValues} className="h-9 w-9 shrink-0">
          {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Summary Cards — horizontally scrollable on mobile */}
      {canViewAllFinancials && (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
            <Card className="glass-card border-success/20 w-[140px] sm:w-auto shrink-0">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">A Receber</p>
                <p className={cn("text-lg font-bold text-success", hideValues && "blur-md select-none")}>
                  {formatCurrency(globalSummary.totalDueReceivable)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-success/30 bg-success/5 w-[140px] sm:w-auto shrink-0">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recebido</p>
                <p className={cn("text-lg font-bold text-success/80", hideValues && "blur-md select-none")}>
                  {formatCurrency(globalSummary.totalPaidReceivable)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-destructive/20 w-[140px] sm:w-auto shrink-0">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">A Pagar</p>
                <p className={cn("text-lg font-bold text-destructive", hideValues && "blur-md select-none")}>
                  {formatCurrency(globalSummary.totalDuePayable)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-destructive/30 bg-destructive/5 w-[140px] sm:w-auto shrink-0">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pago</p>
                <p className={cn("text-lg font-bold text-destructive/80", hideValues && "blur-md select-none")}>
                  {formatCurrency(globalSummary.totalPaidPayable)}
                </p>
              </CardContent>
            </Card>
            <Card className={cn("glass-card w-[140px] sm:w-auto shrink-0", globalSummary.overdueCount > 0 ? "border-warning/30 bg-warning/5" : "")}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Atrasados</p>
                <p className="text-lg font-bold text-warning">{globalSummary.overdueCount}</p>
              </CardContent>
            </Card>
            <Card className={cn("glass-card w-[140px] sm:w-auto shrink-0", globalSummary.overdueCount > 0 ? "border-warning/20" : "")}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor Atraso</p>
                <p className={cn("text-lg font-bold text-warning", hideValues && "blur-md select-none")}>
                  {formatCurrency(globalSummary.overdueAmount)}
                </p>
              </CardContent>
            </Card>
          </div>
          <ScrollBar orientation="horizontal" className="sm:hidden" />
        </ScrollArea>
      )}

      {/* Sub Navigation — scrollable on mobile */}
      {canViewAllFinancials && (
        <ScrollArea className="w-full">
          <nav className="flex gap-1 bg-muted/50 rounded-lg p-1 min-w-max sm:min-w-0">
            {subNavItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <ScrollBar orientation="horizontal" className="sm:hidden" />
        </ScrollArea>
      )}

      {/* Sub-page content */}
      <Outlet />
    </div>
  );
}
