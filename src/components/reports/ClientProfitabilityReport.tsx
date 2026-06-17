import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, TrendingUp, ArrowUpRight, ArrowDownRight, Star, BarChart3 } from 'lucide-react';
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

export function ClientProfitabilityReport() {
  const { currentWorkspace } = useWorkspace();
  const { formatCurrency } = useFormatCurrency();
  const [data, setData] = useState<ClientProfitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'profit' | 'revenue' | 'margin' | 'projects'>('profit');

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchData = async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, client_id, agreed_value, custo_captacao, custo_edicao, custos_extras, is_delivered, delivered_at, clients(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_delivered', true);

      if (!projects) { setLoading(false); return; }

      const byClient: Record<string, ClientProfitability> = {};

      projects.forEach((p: any) => {
        if (!p.client_id) return;
        const name = p.clients?.name || 'Desconhecido';
        if (!byClient[p.client_id]) {
          byClient[p.client_id] = {
            clientId: p.client_id, name,
            totalRevenue: 0, totalCosts: 0, profit: 0, margin: 0,
            projectCount: 0, avgProjectValue: 0, lastProjectDate: null,
          };
        }
        const c = byClient[p.client_id];
        const revenue = p.agreed_value || 0;
        const costs = (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);
        c.totalRevenue += revenue;
        c.totalCosts += costs;
        c.projectCount += 1;
        if (!c.lastProjectDate || (p.delivered_at && p.delivered_at > c.lastProjectDate)) {
          c.lastProjectDate = p.delivered_at;
        }
      });

      const result = Object.values(byClient).map(c => ({
        ...c,
        profit: c.totalRevenue - c.totalCosts,
        margin: c.totalRevenue > 0 ? ((c.totalRevenue - c.totalCosts) / c.totalRevenue) * 100 : 0,
        avgProjectValue: c.projectCount > 0 ? c.totalRevenue / c.projectCount : 0,
      }));

      setData(result);
      setLoading(false);
    };

    fetchData();
  }, [currentWorkspace?.id]);

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
    return sorted.slice(0, 8).map(c => ({
      name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
      receita: c.totalRevenue,
      custos: c.totalCosts,
      lucro: c.profit,
    }));
  }, [sorted]);

  const fmt = (v: number) => formatCurrency(v, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-56" /></CardHeader>
        <CardContent><div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div></CardContent>
      </Card>
    );
  }

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
              <button
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
              </button>
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
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} stroke="hsl(var(--muted-foreground))" />
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
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1.5">
            {sorted.map((client, idx) => (
              <div
                key={client.clientId}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:border-border/80 transition-colors"
              >
                <div className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
                  idx === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                  idx === 1 ? 'bg-gray-300/30 text-gray-500' :
                  idx === 2 ? 'bg-orange-500/20 text-orange-600' :
                  'bg-muted text-muted-foreground'
                )}>
                  {idx < 3 ? <Star className="h-3 w-3" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{client.name}</span>
                    <span className="text-sm font-bold text-success ml-2">{fmt(client.profit)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
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
        </ScrollArea>
      </CardContent>
    </Card>
    </PrivacyBlur>
  );
}
