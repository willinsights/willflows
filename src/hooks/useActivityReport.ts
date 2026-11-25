import { useMemo } from 'react';
import { useProjects } from './useProjects';
import { useFinancialCostLines } from './useFinancialCostLines';
import { fetchAllRows } from '@/lib/fetch-all';
import { buildActivityProjects } from '@/lib/finance/activityReport';
import { useFinancialPermissions } from './useFinancialPermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';

export interface ReportProjeto {
  id: string;
  codigo: string | null;
  projeto: string;
  cliente: string | null;
  tipo: string | null;
  data_entrega: string | null;
  captacao: string | null;
  edicao: string | null;
  versoes: number;
  receita: number;
  custo_colab: number;
  extras: number;
  custo: number;
  lucro: number;
  status: string;
  mes: string | null;
  ano: number | null;
}

export interface ReportGravacao {
  id: string;
  data: string;
  local: string | null;
  cliente: string | null;
  ponto_encontro: string | null;
  producoes: string[];
  colaboradores: string[];
  ano: number | null;
}

export interface ReportDiaria {
  id: string;
  data: string;
  colaborador: string;
  tipo: string;
  valor: number;
  notas: string | null;
  ano: number | null;
}

export interface ReportTrabalho {
  id: string;
  data: string;
  descricao: string;
  cliente: string | null;
  valor: number;
  ano: number | null;
}

export interface ReportCambio {
  id: string;
  de: string;
  para: string;
  taxa: number;
}

export function useActivityReportData() {
  const { workspaceId } = useCurrentWorkspace();

  const { canViewReports } = useFinancialPermissions();
  const live = useProjects();
  const lines = useFinancialCostLines(canViewReports ? workspaceId : undefined);
  const team = useQuery({
    queryKey: ['activity-team', workspaceId], enabled: !!workspaceId && canViewReports,
    staleTime: 30_000, refetchInterval: 30_000, refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!workspaceId) return [];
      return fetchAllRows(() => supabase.from('project_team')
        .select('project_id, phase, external_name, profiles:project_team_user_id_fkey(full_name)')
        .eq('workspace_id', workspaceId).order('id'));
    },
  });
  const current = useQuery({
    queryKey: ['activity-current-projects', workspaceId], enabled: !!workspaceId && canViewReports,
    staleTime: 30_000, refetchInterval: 30_000, refetchOnWindowFocus: true,
    queryFn: async () => { await live.refresh(); return Date.now(); },
  });
  const reportProjects = useMemo(() => buildActivityProjects(live.projects, lines.data ?? [], team.data ?? []), [live.projects, lines.data, team.data]);
  const shots = useMemo(() => {
    const groups = new Map<string, ReportGravacao>();
    for (const p of live.projects) {
      if (!p.shoot_date) continue;
      const key = `${p.shoot_date}:${p.client_id ?? ''}:${p.city ?? ''}`;
      const row = groups.get(key) ?? { id: key, data: p.shoot_date, local: p.city, cliente: p.clients?.name ?? null, ponto_encontro: null, producoes: [], colaboradores: [], ano: Number(p.shoot_date.slice(0,4)) };
      row.producoes.push(p.name); groups.set(key, row);
    }
    return [...groups.values()];
  }, [live.projects]);

  const gravacoes = useQuery({
    queryKey: ['report-gravacoes', workspaceId],
    enabled: !!workspaceId && canViewReports,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gravacoes')
        .select('*')
        .eq('workspace_id', workspaceId ?? '')
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReportGravacao[];
    },
  });

  const diarias = useQuery({
    queryKey: ['report-diarias', workspaceId],
    enabled: !!workspaceId && canViewReports,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estudio_diarias')
        .select('*')
        .eq('workspace_id', workspaceId ?? '')
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReportDiaria[];
    },
  });

  const trabalhos = useQuery({
    queryKey: ['report-trabalhos', workspaceId],
    enabled: !!workspaceId && canViewReports,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trabalhos_complementares')
        .select('*')
        .eq('workspace_id', workspaceId ?? '')
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReportTrabalho[];
    },
  });

  const cambio = useQuery({
    queryKey: ['report-cambio', workspaceId],
    enabled: !!workspaceId && canViewReports,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cambio')
        .select('*')
        .eq('workspace_id', workspaceId ?? '');
      if (error) throw error;
      return (data ?? []) as unknown as ReportCambio[];
    },
  });

  const refetchAll = async () => {
    await Promise.all([
      live.refresh(),
      lines.refetch(),
      team.refetch(),
      gravacoes.refetch(),
      diarias.refetch(),
      trabalhos.refetch(),
      cambio.refetch(),
    ]);
  };

  const isRefetching =
    current.isFetching || lines.isFetching || team.isFetching ||
    gravacoes.isFetching ||
    diarias.isFetching ||
    trabalhos.isFetching ||
    cambio.isFetching;

  const error =
    live.error || lines.error || team.error || gravacoes.error || diarias.error || trabalhos.error || cambio.error || null;

  return {
    projetos: canViewReports ? reportProjects : [],
    updatedAt: current.dataUpdatedAt,
    gravacoes: [...shots, ...(gravacoes.data ?? []).filter(g => !shots.some(s => s.data === g.data && s.cliente === g.cliente))],
    diarias: diarias.data ?? [],
    trabalhos: trabalhos.data ?? [],
    cambio: cambio.data ?? [],
    isLoading:
      live.loading || lines.isLoading || team.isLoading || gravacoes.isLoading || diarias.isLoading || trabalhos.isLoading,
    refetchAll,
    isRefetching,
    error,
  };
}

type ImportTable = 'projetos' | 'gravacoes' | 'estudio_diarias' | 'trabalhos_complementares' | 'cambio';

export function useActivityReportMutations() {
  const { workspaceId } = useCurrentWorkspace();
  const qc = useQueryClient();

  const invalidate = () => {
    ['report-projetos', 'report-gravacoes', 'report-diarias', 'report-trabalhos', 'report-cambio'].forEach(
      (k) => qc.invalidateQueries({ queryKey: [k, workspaceId] }),
    );
  };

  const importRows = useMutation({
    mutationFn: async ({ table, rows }: { table: ImportTable; rows: Record<string, unknown>[] }) => {
      if (!workspaceId) throw new Error('Sem workspace ativo');
      if (!rows.length) return 0;
      const payload = rows.map((r) => ({ ...r, workspace_id: workspaceId }));
      const { error } = await supabase.from(table as never).insert(payload as never);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: invalidate,
  });

  const clearTable = useMutation({
    mutationFn: async (table: ImportTable) => {
      if (!workspaceId) throw new Error('Sem workspace ativo');
      const { error } = await supabase.from(table as never).delete().eq('workspace_id', workspaceId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { importRows, clearTable, workspaceId };
}
