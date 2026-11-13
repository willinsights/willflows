import { getCostCategoryTotals } from '@/lib/finance/costLineReconciliation';
import type { FinancialProject, CostLinePayment } from '@/lib/finance/types';
import { PrivacyBlur } from '@/components/ui/PrivacyBlur';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { costCategoryLabels, type CostCategory } from '@/hooks/useProjectCostLines';

const CATEGORY_COLORS: Record<string, string> = {
  equipamento: 'hsl(var(--primary))',
  deslocacao: 'hsl(var(--warning))',
  alojamento: 'hsl(var(--success))',
  alimentacao: 'hsl(var(--destructive))',
  equipa: 'hsl(var(--info))',
  software: 'hsl(var(--info))',
  outro: 'hsl(var(--muted-foreground))',
};

export function CostBreakdownReport({ projects, costLines, dateRange }: {
  projects: FinancialProject[]; costLines: CostLinePayment[]; dateRange: { start: Date; end: Date };
}) {
  const { formatCurrency } = useFormatCurrency();
  const breakdown = useMemo(() => getCostCategoryTotals(projects, costLines, dateRange).map(data => ({
    ...data,
    label: costCategoryLabels[data.category as CostCategory] || data.category,
    variancePercent: data.estimated > 0 ? (data.variance / data.estimated) * 100 : 0,
    color: CATEGORY_COLORS[data.category] || 'hsl(var(--muted-foreground))',
  })), [projects, costLines, dateRange]);

  const totalActual = breakdown.reduce((s, b) => s + b.actual, 0);
  const totalEstimated = breakdown.reduce((s, b) => s + b.estimated, 0);
  const totalVariance = totalActual - totalEstimated;

  const pieData = breakdown.map(b => ({ name: b.label, value: b.actual, color: b.color }));

  if (breakdown.length === 0) return <p className="py-4 text-sm text-muted-foreground">Nenhuma linha de custo neste período.</p>;

  return (
    <PrivacyBlur className="grid md:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            Linhas de Custo por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-3 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Estimado</span>
              <span className="font-medium">{formatCurrency(totalEstimated)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Real</span>
              <span className="font-medium">{formatCurrency(totalActual)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Desvio</span>
              <Badge variant={totalVariance > 0 ? 'destructive' : 'default'} className="text-xs">
                {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimated vs Actual Bar Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Estimado vs Real por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="estimated" name="Estimado" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="actual" name="Real" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-3 border-t">
            <div className="space-y-1.5">
              {breakdown.map(b => (
                <div key={b.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span>{b.label}</span>
                    <span className="text-muted-foreground">({b.count})</span>
                  </div>
                  <span className={b.variancePercent > 10 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    {b.variancePercent > 0 ? '+' : ''}{b.variancePercent.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </PrivacyBlur>
  );
}
