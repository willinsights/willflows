import { useMemo } from 'react';
import { subMonths, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Minus, GitCompare } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { getMonthlyMetrics } from '@/lib/finance/financialEngine';
import type { FinancialProject } from '@/lib/finance/types';
import { cn } from '@/lib/utils';

interface PeriodComparisonCardProps {
  projects: any[];
}

function ChangeIndicator({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (Math.abs(value) < 0.5) {
    return <span className="flex items-center text-muted-foreground text-xs"><Minus className="h-3 w-3 mr-0.5" />0%</span>;
  }
  const positive = value > 0;
  return (
    <span className={cn('flex items-center text-xs font-medium', positive ? 'text-success' : 'text-destructive')}>
      {positive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
      {positive ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  );
}

export function PeriodComparisonCard({ projects }: PeriodComparisonCardProps) {
  const { formatCurrency } = useFormatCurrency();

  const comparison = useMemo(() => {
    const now = new Date();
    const currentMonth = now;
    const previousMonth = subMonths(now, 1);

    const mapped: FinancialProject[] = projects.map(p => ({
      id: p.id,
      agreed_value: p.agreed_value,
      custo_captacao: p.custo_captacao,
      custo_edicao: p.custo_edicao,
      custos_extras: p.custos_extras,
      custos_extras_payment_status: p.custos_extras_payment_status,
      custos_extras_paid_at: p.custos_extras_paid_at,
      is_delivered: p.is_delivered,
      delivered_at: p.delivered_at,
      delivery_date: p.delivery_date,
      shoot_date: p.shoot_date,
      created_at: p.created_at,
      client_payment_status: p.client_payment_status,
      client_paid_at: p.client_paid_at,
      competence_month: p.competence_month,
    }));

    const current = getMonthlyMetrics(mapped, 'REALIZADO', currentMonth);
    const previous = getMonthlyMetrics(mapped, 'REALIZADO', previousMonth);

    const revenueChange = previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue * 100) : 0;
    const costChange = previous.cost > 0 ? ((current.cost - previous.cost) / previous.cost * 100) : 0;
    const profitChange = previous.profit > 0 ? ((current.profit - previous.profit) / previous.profit * 100) : 0;
    const currentMargin = current.revenue > 0 ? (current.profit / current.revenue * 100) : 0;
    const previousMargin = previous.revenue > 0 ? (previous.profit / previous.revenue * 100) : 0;

    return {
      currentLabel: format(currentMonth, 'MMMM yyyy', { locale: pt }),
      previousLabel: format(previousMonth, 'MMMM yyyy', { locale: pt }),
      current,
      previous,
      revenueChange,
      costChange,
      profitChange,
      currentMargin,
      previousMargin,
      marginChange: currentMargin - previousMargin,
    };
  }, [projects]);

  const rows = [
    { label: 'Receita', current: comparison.current.revenue, previous: comparison.previous.revenue, change: comparison.revenueChange },
    { label: 'Custos', current: comparison.current.cost, previous: comparison.previous.cost, change: comparison.costChange, invertColor: true },
    { label: 'Lucro', current: comparison.current.profit, previous: comparison.previous.profit, change: comparison.profitChange },
    { label: 'Projetos', current: comparison.current.projectCount, previous: comparison.previous.projectCount, change: comparison.previous.projectCount > 0 ? ((comparison.current.projectCount - comparison.previous.projectCount) / comparison.previous.projectCount * 100) : 0, isCount: true },
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-4 w-4 text-primary" />
          Comparação Mensal
        </CardTitle>
        <p className="text-xs text-muted-foreground capitalize">
          {comparison.previousLabel} → {comparison.currentLabel}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">Métrica</th>
                <th className="text-right py-2 font-medium text-muted-foreground capitalize">{comparison.previousLabel.split(' ')[0]}</th>
                <th className="text-right py-2 font-medium text-muted-foreground capitalize">{comparison.currentLabel.split(' ')[0]}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Variação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-2.5 font-medium">{row.label}</td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {row.isCount ? row.previous : formatCurrency(row.previous)}
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    {row.isCount ? row.current : formatCurrency(row.current)}
                  </td>
                  <td className="py-2.5 text-right">
                    <ChangeIndicator value={row.change} suffix="%" />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 font-medium">Margem</td>
                <td className="py-2.5 text-right text-muted-foreground">{comparison.previousMargin.toFixed(1)}%</td>
                <td className="py-2.5 text-right">
                  <Badge variant={comparison.currentMargin >= 30 ? 'default' : comparison.currentMargin >= 15 ? 'secondary' : 'destructive'}>
                    {comparison.currentMargin.toFixed(1)}%
                  </Badge>
                </td>
                <td className="py-2.5 text-right">
                  <ChangeIndicator value={comparison.marginChange} suffix="pp" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
