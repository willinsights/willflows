import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CollaboratorData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalValue: number;
  projectCount: number;
  phases: string[];
  isExternal: boolean;
}

interface UseCollaboratorRankingOptions {
  workspaceId: string | undefined;
  deliveredProjectIds: string[];
}

export function useCollaboratorRanking({ workspaceId, deliveredProjectIds }: UseCollaboratorRankingOptions) {
  const [data, setData] = useState<CollaboratorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!workspaceId || deliveredProjectIds.length === 0) {
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);

      // Try the join query first
      const { data: teamData, error: joinErr } = await supabase
        .from('project_team')
        .select(`
          user_id,
          external_name,
          is_external,
          payment_amount,
          phase,
          project_id,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .in('project_id', deliveredProjectIds);

      let finalTeamData = teamData;
      if (joinErr || !teamData) {
        // Fallback: fetch without join
        const { data: basicTeamData, error: fallbackErr } = await supabase
          .from('project_team')
          .select('user_id, external_name, is_external, payment_amount, phase, project_id')
          .in('project_id', deliveredProjectIds);

        if (fallbackErr || !basicTeamData) {
          setError('Falha ao carregar colaboradores');
          setLoading(false);
          return;
        }

        const userIds = [...new Set(basicTeamData.filter(t => t.user_id).map(t => t.user_id))];
        let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);
          if (profilesData) {
            profilesMap = profilesData.reduce((acc, p) => {
              acc[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
              return acc;
            }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
          }
        }

        finalTeamData = basicTeamData.map(entry => ({
          ...entry,
          profiles: entry.user_id ? profilesMap[entry.user_id] || null : null,
        }));
      }

      if (!finalTeamData || finalTeamData.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Aggregate by collaborator
      const stats: Record<string, CollaboratorData & { projectIds: Set<string> }> = {};

      finalTeamData.forEach((entry: any) => {
        const isExternal = entry.is_external || !entry.user_id;
        const key = isExternal ? `ext_${entry.external_name}` : entry.user_id;
        const name = isExternal
          ? entry.external_name
          : (entry.profiles?.full_name || 'Desconhecido');
        const avatarUrl = isExternal ? null : entry.profiles?.avatar_url;

        if (!stats[key]) {
          stats[key] = {
            userId: key,
            name,
            avatarUrl,
            totalValue: 0,
            projectCount: 0,
            phases: [],
            isExternal,
            projectIds: new Set(),
          };
        }

        stats[key].totalValue += entry.payment_amount || 0;
        if (!stats[key].phases.includes(entry.phase)) {
          stats[key].phases.push(entry.phase);
        }
        stats[key].projectIds.add(entry.project_id);
      });

      const sorted = Object.values(stats)
        .map(({ projectIds, ...rest }) => ({
          ...rest,
          projectCount: projectIds.size,
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      setData(sorted);
      setLoading(false);
    };

    fetchCollaborators();
  }, [workspaceId, deliveredProjectIds.join(',')]);

  return { collaboratorsData: data, collaboratorsLoading: loading, collaboratorsError: error };
}
