import { PrivacyBlur } from '@/components/ui/PrivacyBlur';
import { useMemo, useState } from 'react';
import { getEffectiveMonth, getProjectCost, withFinancialCostLines } from '@/lib/finance/financialEngine';
import type { ProjectWithClient } from '@/hooks/useProjects';
import type { CostLinePayment } from '@/lib/finance/types';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Star, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';

interface ClientProfitability {
  clientId: string;
  name: string;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  margin: number;
  projectCount: number;
  avgProjectValue: number;
  lastProjectDate: string | null;
}

export function ClientProfitabilityReport({ projects, costLines, dateRange }: { projects: ProjectWithClient[]; costLines: CostLinePayment[]; dateRange: { start: Date; end: Date } }) {
  const { formatCurrency } = useFormatCurrency();
  const [sortBy, setSortBy] = useState<'profit' | 'revenue' | 'margin' | 'projects'>('profit');
  const data = useMemo(() => {
    const costs = new Map(withFinancialCostLines(projects, costLines).map(p => [p.id, getProjectCost(p)]));
    const interval = { start: startOfMonth(dateRange.start), end: endOfMonth(dateRange.end) };
    const byClient: Record<string, ClientProfitability> = {};
    for (const p of projects) {
      const month = getEffectiveMonth(p);
      if (!p.is_delivered || !p.client_id || !month || !isWithinInterval(month, interval)) continue;
      const c = byClient[p.client_id] ?? { clientId:p.client_id, name:p.clients?.name || 'Sem nome', totalRevenue:0, totalCosts:0, profit:0, margin:0, projectCount:0, avgProjectValue:0, lastProjectDate:null };
      c.totalRevenue += Number(p.agreed_value ?? 0);
      c.totalCosts += costs.get(p.id) ?? 0;
      c.projectCount++;
      byClient[p.client_id] = c;
    }
    return Object.values(byClient).map(c => ({ ...c, profit:c.totalRevenue-c.totalCosts, margin:c.totalRevenue>0 ? (c.totalRevenue-c.totalCosts)/c.totalRevenue*100 : 0, avgProjectValue:c.totalRevenue/c.projectCount }));
  }, [projects,costLines,dateRange]);

  const sorted = useMemo(() => {
    const sorted = [...data];
    switch (sortBy) {
      case 'profit': return sorted.sort((a, b) => b.profit - a.profit);
      case 'revenue': return sorted.sort((a, b) => b.totalRevenue - a.totalRevenue);
      case 'margin': return sorted.sort((a, b) => b.margin - a.margin);
      case 'projects': return sorted.sort((a, b) => b.projectCount - a.projectCount);
      default: return sorted;
    }
  }, [data, sortBy]);

  const chartData = useMemo(() => {
    return sorted.slice(0, 3).map(c => ({
      name: c.name.length > 20 ? c.name.slice(0, 20) + '…' : c.name,
      receita: c.totalRevenue,
      custos: c.totalCosts,
      lucro: c.profit,
    }));
  }, [sorted]);

  const fmt = (v: number) => formatCurrency(v, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Rentabilidade por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">Sem dados — entregue projetos para ver a análise.</p>
        </CardContent>
      </Card>
    );
  }

  const sortOptions: { key: typeof sortBy; label: string }[] = [
    { key: 'profit', label: 'Lucro' },
    { key: 'revenue', label: 'Receita' },
    { key: 'margin', label: 'Margem' },
    { key: 'projects', label: 'Projetos' },
  ];

  return (
    <PrivacyBlur>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Rentabilidade por Cliente
            <Badge variant="secondary" className="text-[10px]">{data.length}</Badge>
          </CardTitle>
          <div className="flex gap-1">
            {sortOptions.map(opt => (
              <Button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={cn(
                  'text-[11px] px-2 py-1 rounded-md transition-colors',
                  sortBy === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={125} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => fmt(value)}
              />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="h-[300px] overflow-y-auto overscroll-contain pr-2" role="region" aria-label="Lista completa de clientes" tabIndex={0}>
          <div className="space-y-1.5">
            {sorted.map((client, idx) => (
              <div
                key={client.clientId}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:border-border/80 transition-colors"
              >
                <div className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
                  idx === 0 ? 'bg-warning/20 text-warning' :
                  idx === 1 ? 'bg-muted text-muted-foreground' :
                  idx === 2 ? 'bg-primary/20 text-primary' :
                  'bg-muted text-muted-foreground'
                )}>
                  {idx < 3 ? <Star className="h-3 w-3" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium break-words min-w-0">{client.name}</span>
                    <span className="text-sm font-bold text-success ml-2">{fmt(client.profit)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11px] text-muted-foreground">
                    <span>Receita: {fmt(client.totalRevenue)}</span>
                    <Badge
                      variant={client.margin >= 30 ? 'default' : client.margin >= 15 ? 'secondary' : 'destructive'}
                      className="text-[9px] px-1 py-0 h-4"
                    >
                      {client.margin.toFixed(0)}%
                    </Badge>
                    <span>{client.projectCount} proj.</span>
                    <span>Média: {fmt(client.avgProjectValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
    </PrivacyBlur>
  );
}
