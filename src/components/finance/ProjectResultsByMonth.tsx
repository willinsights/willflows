import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money } from '@/components/finance/Money';

/**
 * Resultado por projeto entregue no mês (competência).
 * Edição/Captação = custo do card (cost_amount ?? payment_amount, já somado em projects.custo_*).
 * Lucro = Receita − (Edição + Captação + extras + custos detalhados). Meu total = Receita − Edição.
 */
export function ProjectResultsByMonth() {
  const { projects } = useProjects();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM')),
    [],
  );
  const [month, setMonth] = useState(months[0]);

  const { data: costLines = [] } = useQuery({
    queryKey: ['finance', 'engine-cost-lines', wsId, 'results-by-month'] as const,
    enabled: !!wsId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_cost_lines')
        .select('project_id, actual_amount')
        .eq('workspace_id', wsId!)
        .neq('payment_status', 'cancelado');
      if (error) throw error;
      return data || [];
    },
  });

  const { rows, total } = useMemo(() => {
    const lines = new Map<string, number>();
    for (const cl of costLines) lines.set(cl.project_id, (lines.get(cl.project_id) || 0) + Number(cl.actual_amount || 0));
    const rows = projects
      .filter((p) => {
        if (!p.is_delivered) return false;
        const comp = (p as { competence_month?: string | null }).competence_month;
        if (comp) return comp.slice(0, 7) === month;
        return !!p.delivered_at && p.delivered_at.slice(0, 7) === month;
      })
      .map((p) => {
        const rev = Number(p.agreed_value || 0);
        const ed = Number(p.custo_edicao || 0);
        const cap = Number(p.custo_captacao || 0);
        const other = Number(p.custos_extras || 0) + (lines.get(p.id) || 0);
        return {
          id: p.id,
          code: p.project_code || p.id.slice(0, 8).toUpperCase(),
          name: p.name,
          rev, ed, cap,
          profit: rev - (ed + cap + other),
          mine: rev - ed,
        };
      });
    const total = rows.reduce(
      (t, r) => ({ rev: t.rev + r.rev, ed: t.ed + r.ed, cap: t.cap + r.cap, profit: t.profit + r.profit, mine: t.mine + r.mine }),
      { rev: 0, ed: 0, cap: 0, profit: 0, mine: 0 },
    );
    return { rows, total };
  }, [projects, costLines, month]);

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Resultado por projeto</h3>
            <p className="text-xs text-muted-foreground">Meu total = Receita − custo de edição dos cards.</p>
          </div>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{format(new Date(`${m}-01T12:00:00`), 'MMMM yyyy', { locale: pt })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Edição</TableHead>
                <TableHead className="text-right">Captação</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Meu total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Sem projetos entregues neste mês.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="min-w-[160px]">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.code}</div>
                  </TableCell>
                  <TableCell className="text-right"><Money value={r.rev} tone="income" /></TableCell>
                  <TableCell className="text-right"><Money value={r.ed} /></TableCell>
                  <TableCell className="text-right"><Money value={r.cap} /></TableCell>
                  <TableCell className="text-right"><Money value={r.profit} tone="profit" /></TableCell>
                  <TableCell className="text-right"><Money value={r.mine} tone="profit" /></TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>Total ({rows.length})</TableCell>
                  <TableCell className="text-right"><Money value={total.rev} tone="income" /></TableCell>
                  <TableCell className="text-right"><Money value={total.ed} /></TableCell>
                  <TableCell className="text-right"><Money value={total.cap} /></TableCell>
                  <TableCell className="text-right"><Money value={total.profit} tone="profit" /></TableCell>
                  <TableCell className="text-right"><Money value={total.mine} tone="profit" /></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
