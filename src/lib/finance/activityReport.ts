import { getEffectiveMonth, getProjectCost, withFinancialCostLines } from './financialEngine';
import type { FinancialProject, CostLinePayment } from './types';
import type { ReportProjeto } from '@/hooks/useActivityReport';

type ActivityProject = FinancialProject & { name: string; project_code: string | null; type: string; clients: { name: string } | null };
type Assignment = { project_id: string; phase: string; external_name: string | null; profiles: { full_name: string | null } | null };

export function buildActivityProjects(projects: ActivityProject[], lines: CostLinePayment[], team: Assignment[]): ReportProjeto[] {
  const costs = new Map(withFinancialCostLines(projects, lines).map(p => [p.id, getProjectCost(p)]));
  const names = new Map<string, Set<string>>();
  for (const member of team) {
    const name = member.profiles?.full_name || member.external_name;
    if (!name) continue;
    const key = `${member.project_id}:${member.phase}`;
    const list = names.get(key) ?? new Set<string>();
    list.add(name); names.set(key, list);
  }
  return projects.filter(p => p.is_delivered).map(p => {
    const date = getEffectiveMonth(p);
    const revenue = Number(p.agreed_value ?? 0), cost = costs.get(p.id) ?? 0;
    return { id: p.id, codigo: p.project_code, projeto: p.name, cliente: p.clients?.name ?? null,
      tipo: p.type, data_entrega: p.delivered_at, captacao: [...(names.get(`${p.id}:captacao`) ?? [])].join(', ') || null,
      edicao: [...(names.get(`${p.id}:edicao`) ?? [])].join(', ') || null, versoes: 0,
      receita: revenue, custo_colab: Number(p.custo_edicao ?? 0), extras: Number(p.custos_extras ?? 0),
      custo: cost, lucro: revenue - cost, status: 'entregue', mes: date ? String(date.getMonth() + 1).padStart(2, '0') : null,
      ano: date?.getFullYear() ?? null };
  });
}