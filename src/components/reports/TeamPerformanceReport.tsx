import { useMemo, useState, useEffect } from 'react';
import { Users, Clock, CheckCircle2, Briefcase, TrendingUp, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface TeamMemberStats {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalProjects: number;
  deliveredProjects: number;
  activeProjects: number;
  completionRate: number;
  avgDeliveryDays: number;
  totalRevenue: number;
  totalPayment: number;
  captacaoCount: number;
  edicaoCount: number;
}

type SortKey = 'projects' | 'completion' | 'speed' | 'revenue';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(142 76% 36%)',
  'hsl(var(--warning))',
  'hsl(220 70% 50%)',
  'hsl(280 65% 60%)',
  'hsl(340 75% 55%)',
  'hsl(30 80% 55%)',
];

export function TeamPerformanceReport() {
  const { currentWorkspace } = useWorkspace();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMemberStats[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('projects');

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchData = async () => {
      setLoading(true);
      const wsId = currentWorkspace.id;

      const [teamRes, projectsRes, profilesRes] = await Promise.all([
        supabase
          .from('project_team')
          .select('user_id, project_id, phase, payment_amount, payment_status')
          .not('user_id', 'is', null),
        supabase
          .from('projects')
          .select('id, name, is_delivered, delivered_at, created_at, shoot_date, agreed_value, current_phase, workspace_id')
          .eq('workspace_id', wsId),
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url'),
      ]);

      const teamAssignments = teamRes.data || [];
      const projects = projectsRes.data || [];
      const profiles = profilesRes.data || [];

      const projectMap = new Map(projects.map(p => [p.id, p]));
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      // Filter team assignments to only this workspace's projects
      const wsTeam = teamAssignments.filter(t => projectMap.has(t.project_id));

      // Group by user
      const userMap = new Map<string, typeof wsTeam>();
      for (const t of wsTeam) {
        if (!t.user_id) continue;
        const arr = userMap.get(t.user_id) || [];
        arr.push(t);
        userMap.set(t.user_id, arr);
      }

      const stats: TeamMemberStats[] = [];
      for (const [userId, assignments] of userMap) {
        const profile = profileMap.get(userId);
        if (!profile) continue;

        const projectIds = [...new Set(assignments.map(a => a.project_id))];
        const memberProjects = projectIds.map(id => projectMap.get(id)).filter(Boolean) as typeof projects;

        const delivered = memberProjects.filter(p => p.is_delivered);
        const active = memberProjects.filter(p => !p.is_delivered);
        const completionRate = memberProjects.length > 0 ? (delivered.length / memberProjects.length) * 100 : 0;

        // Avg delivery days
        let avgDays = 0;
        if (delivered.length > 0) {
          const totalDays = delivered.reduce((sum, p) => {
            const start = new Date(p.shoot_date || p.created_at);
            const end = new Date(p.delivered_at!);
            return sum + Math.max(0, differenceInDays(end, start));
          }, 0);
          avgDays = Math.round(totalDays / delivered.length);
        }

        const totalRevenue = memberProjects.reduce((s, p) => s + (p.agreed_value || 0), 0);
        const totalPayment = assignments.reduce((s, a) => s + (a.payment_amount || 0), 0);
        const captacaoCount = assignments.filter(a => a.phase === 'captacao').length;
        const edicaoCount = assignments.filter(a => a.phase === 'edicao').length;

        stats.push({
          userId,
          name: profile.full_name || profile.email,
          avatarUrl: profile.avatar_url,
          totalProjects: memberProjects.length,
          deliveredProjects: delivered.length,
          activeProjects: active.length,
          completionRate,
          avgDeliveryDays: avgDays,
          totalRevenue,
          totalPayment,
          captacaoCount,
          edicaoCount,
        });
      }

      setMembers(stats);
      setLoading(false);
    };

    fetchData();
  }, [currentWorkspace?.id]);

  const sorted = useMemo(() => {
    const copy = [...members];
    switch (sortBy) {
      case 'projects': return copy.sort((a, b) => b.totalProjects - a.totalProjects);
      case 'completion': return copy.sort((a, b) => b.completionRate - a.completionRate);
      case 'speed': return copy.sort((a, b) => (a.avgDeliveryDays || 999) - (b.avgDeliveryDays || 999));
      case 'revenue': return copy.sort((a, b) => b.totalRevenue - a.totalRevenue);
      default: return copy;
    }
  }, [members, sortBy]);

  const chartData = useMemo(() => {
    return sorted.slice(0, 10).map(m => ({
      name: m.name.length > 12 ? m.name.slice(0, 12) + '…' : m.name,
      fullName: m.name,
      entregues: m.deliveredProjects,
      ativos: m.activeProjects,
    }));
  }, [sorted]);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader><Skeleton className="h-6 w-56" /></CardHeader>
        <CardContent><div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div></CardContent>
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Performance da Equipa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Nenhum membro com projetos atribuídos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Performance da Equipa
              <Badge variant="secondary" className="text-[10px]">{members.length} membros</Badge>
            </CardTitle>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="projects">Mais projetos</SelectItem>
                <SelectItem value="completion">Maior conclusão</SelectItem>
                <SelectItem value="speed">Mais rápido</SelectItem>
                <SelectItem value="revenue">Maior receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Chart */}
          {chartData.length > 0 && (
            <div className="h-[220px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => [value, name === 'entregues' ? 'Entregues' : 'Ativos']}
                  />
                  <Bar dataKey="entregues" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} name="Entregues" />
                  <Bar dataKey="ativos" stackId="a" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Ativos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Member Cards */}
          <TooltipProvider>
            <div className="space-y-3">
              {sorted.map((m, idx) => (
                <motion.div
                  key={m.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        m.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name & badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{m.name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {m.captacaoCount} capt · {m.edicaoCount} ed
                        </Badge>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 text-primary" />
                              <span className="text-muted-foreground">Projetos:</span>
                              <span className="font-semibold">{m.totalProjects}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{m.deliveredProjects} entregues, {m.activeProjects} ativos</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              <span className="text-muted-foreground">Conclusão:</span>
                              <span className={cn('font-semibold', m.completionRate >= 80 ? 'text-success' : m.completionRate >= 50 ? 'text-warning' : 'text-destructive')}>
                                {m.completionRate.toFixed(0)}%
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{m.deliveredProjects} de {m.totalProjects} projetos concluídos</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-info" />
                              <span className="text-muted-foreground">Tempo:</span>
                              <span className="font-semibold">{m.avgDeliveryDays > 0 ? `${m.avgDeliveryDays}d` : '—'}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>Tempo médio de entrega</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3 text-success" />
                              <span className="text-muted-foreground">Receita:</span>
                              <span className="font-semibold">{formatCurrency(m.totalRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>Receita total dos projetos atribuídos</p></TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <Progress value={m.completionRate} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
