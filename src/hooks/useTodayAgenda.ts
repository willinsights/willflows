import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface TodayTask { id: string; title: string; due_date: string | null; project_id: string | null; overdue: boolean }
export interface TodayWork { id: string; title: string; requested_at: string | null; status: string; is_urgent: boolean }
export interface TodayEvent { id: string; title: string; start_at: string; all_day: boolean; location: string | null }
export interface TodayProject { id: string; name: string; project_code: string | null; kind: 'captacao' | 'entrega' | 'atrasado'; date: string }
export interface StalledProject { id: string; name: string; project_code: string | null; updated_at: string }

export interface TodayAgenda {
  tasks: TodayTask[];
  works: TodayWork[];
  events: TodayEvent[];
  projects: TodayProject[];
  stalled: StalledProject[];
}

const STALLED_DAYS = 14;

/**
 * Single source for the "Hoje" view and the Dashboard action zone.
 * RLS decides visibility; tasks/works are scoped to the current user.
 */
export function useTodayAgenda() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const uid = user?.id;

  return useQuery({
    queryKey: ['today-agenda', wsId, uid],
    enabled: !!wsId && !!uid,
    staleTime: 60_000,
    queryFn: async (): Promise<TodayAgenda> => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const stalledBefore = subDays(now, STALLED_DAYS).toISOString();

      const [assignRes, worksRes, eventsRes, projRes, stalledRes] = await Promise.all([
        supabase
          .from('task_assignees')
          .select('task:tasks!inner(id,title,due_date,project_id,is_completed,workspace_id)')
          .eq('user_id', uid!)
          .eq('task.workspace_id', wsId!)
          .eq('task.is_completed', false)
          .lte('task.due_date', today),
        supabase
          .from('work_logs')
          .select('id,title,requested_at,status,is_urgent')
          .eq('workspace_id', wsId!)
          .eq('assignee_id', uid!)
          .neq('status', 'concluido')
          .order('is_urgent', { ascending: false })
          .limit(50),
        supabase
          .from('calendar_events')
          .select('id,title,start_at,all_day,location')
          .eq('workspace_id', wsId!)
          .gte('start_at', startOfDay(now).toISOString())
          .lte('start_at', endOfDay(now).toISOString())
          .order('start_at'),
        supabase
          .from('projects')
          .select('id,name,project_code,shoot_date,delivery_date')
          .eq('workspace_id', wsId!)
          .eq('is_delivered', false)
          .or(`shoot_date.eq.${today},delivery_date.lte.${today}`)
          .limit(50),
        supabase
          .from('projects')
          .select('id,name,project_code,updated_at')
          .eq('workspace_id', wsId!)
          .eq('is_delivered', false)
          .lt('updated_at', stalledBefore)
          .order('updated_at')
          .limit(20),
      ]);

      const tasks: TodayTask[] = ((assignRes.data ?? []) as any[])
        .map(r => r.task)
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, title: t.title, due_date: t.due_date, project_id: t.project_id, overdue: !!t.due_date && t.due_date < today }));

      const projects: TodayProject[] = ((projRes.data ?? []) as any[]).map(p => {
        if (p.shoot_date === today) return { id: p.id, name: p.name, project_code: p.project_code, kind: 'captacao' as const, date: p.shoot_date };
        const kind = p.delivery_date === today ? 'entrega' as const : 'atrasado' as const;
        return { id: p.id, name: p.name, project_code: p.project_code, kind, date: p.delivery_date };
      });

      return {
        tasks,
        works: (worksRes.data ?? []) as TodayWork[],
        events: (eventsRes.data ?? []) as TodayEvent[],
        projects,
        stalled: (stalledRes.data ?? []) as StalledProject[],
      };
    },
  });
}

/** Pending people costs of delivered projects (competência = mês da entrega). */
export function usePendingTeamPayables(enabled: boolean) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ['pending-team-payables', wsId],
    enabled: enabled && !!wsId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team')
        .select('payment_amount, user_id, external_name, projects!inner(is_delivered, workspace_id)')
        .eq('projects.workspace_id', wsId!)
        .eq('projects.is_delivered', true)
        .eq('payment_status', 'pendente')
        .gt('payment_amount', 0);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const people = new Set(rows.map(r => r.user_id ?? r.external_name));
      return { total: rows.reduce((s, r) => s + Number(r.payment_amount || 0), 0), count: rows.length, people: people.size };
    },
  });
}
