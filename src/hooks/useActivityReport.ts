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

  const projetos = useQuery({
    queryKey: ['report-projetos', workspaceId],
    enabled: !!workspaceId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('data_entrega', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReportProjeto[];
    },
  });

  const gravacoes = useQuery({
    queryKey: ['report-gravacoes', workspaceId],
    enabled: !!workspaceId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gravacoes')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReportGravacao[];
    },
  });

  const diarias = useQuery({
    queryKey: ['report-diarias', workspaceId],
    enabled: !!workspaceId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estudio_diarias')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReportDiaria[];
    },
  });

  const trabalhos = useQuery({
    queryKey: ['report-trabalhos', workspaceId],
    enabled: !!workspaceId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trabalhos_complementares')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReportTrabalho[];
    },
  });

  const cambio = useQuery({
    queryKey: ['report-cambio', workspaceId],
    enabled: !!workspaceId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cambio')
        .select('*')
        .eq('workspace_id', workspaceId!);
      if (error) throw error;
      return (data ?? []) as unknown as ReportCambio[];
    },
  });

  return {
    projetos: projetos.data ?? [],
    gravacoes: gravacoes.data ?? [],
    diarias: diarias.data ?? [],
    trabalhos: trabalhos.data ?? [],
    cambio: cambio.data ?? [],
    isLoading:
      projetos.isLoading || gravacoes.isLoading || diarias.isLoading || trabalhos.isLoading,
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
