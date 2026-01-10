import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Camera,
  Film,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CreditCard,
  ArrowRight,
  Clock,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { ProductTour } from '@/components/tour/ProductTour';
import { TrialBanner } from '@/components/dashboard/TrialBanner';
import { useProductTour } from '@/hooks/useProductTour';
import { useDashboardMetrics, UrgentProject } from '@/hooks/useDashboardMetrics';
import { useNavigate } from 'react-router-dom';
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal';
import type { ProjectWithClient } from '@/hooks/useKanban';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showTour, completeTour, skipTour } = useProductTour();
  const { metrics, urgentProjects, recentActivity, monthlyData, loading, refresh } = useDashboardMetrics();
  
  // State for project details modal
  const [selectedProject, setSelectedProject] = useState<ProjectWithClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProjectClick = (project: UrgentProject) => {
    // Convert UrgentProject to minimal ProjectWithClient for modal
    const projectForModal: ProjectWithClient = {
      id: project.id,
      name: project.name,
      type: project.type as 'fotografia' | 'video' | 'foto_video',
      priority: project.priority as 'baixa' | 'media' | 'alta' | 'urgente',
      current_phase: 'captacao',
      is_delivered: false,
      workspace_id: currentWorkspace?.id || '',
      created_at: '',
      updated_at: '',
      category: 'outro',
      clients: { name: project.client },
      delivery_date: project.date || null,
      agreed_value: null,
      custo_captacao: null,
      custo_edicao: null,
      client_id: null,
      shoot_date: null,
      shoot_start_time: null,
      shoot_end_time: null,
      address: null,
      city: null,
      country: null,
      region: null,
      captacao_column_id: null,
      edicao_column_id: null,
      notes: null,
      internal_notes: null,
      drive_folder_url: null,
      dropbox_folder_url: null,
      frameio_project_id: null,
      google_meet_url: null,
      estimated_costs: null,
      payment_method: null,
      delivered_at: null,
      created_by: null,
      custom_category_id: null,
      project_code: null,
      item_type: null,
      custos_extras: null,
    };
    setSelectedProject(projectForModal);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 19) return 'Boa tarde';
    return 'Boa noite';
  };

  const userName = user?.user_metadata?.full_name || currentWorkspace?.name || 'Utilizador';
  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM", { locale: pt });
  const formattedTime = format(currentTime, 'HH:mm');
  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'priority-urgente';
      case 'alta': return 'priority-alta';
      case 'media': return 'priority-media';
      default: return 'priority-baixa';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Film;
      case 'fotografia': return Camera;
      default: return Camera;
    }
  };

  return (
    <div className="p-3 md:p-4 space-y-3 md:space-y-4 max-w-[1400px] mx-auto">
      {/* Product Tour */}
      {showTour && (
        <ProductTour onComplete={completeTour} onSkip={skipTour} />
      )}

      {/* Trial Banner */}
      <TrialBanner />
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1"
      >
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            {getGreeting()}, <span className="gradient-text">{userName.split(' ')[0]}</span>!
          </h1>
          <p className="text-[11px] md:text-xs text-muted-foreground capitalize">
            {formattedDate} • {formattedTime}
          </p>
        </div>
      </motion.div>

      {/* KPIs Row - 3 colunas x 2 linhas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {/* Captação */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <Card className="metric-card hover:border-primary/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-8" />
                ) : (
                  <span className="text-2xl font-bold">{metrics.captacao}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Em Captação</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edição */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <Card className="metric-card hover:border-primary/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-info/10">
                  <Film className="h-4 w-4 text-info" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-8" />
                ) : (
                  <span className="text-2xl font-bold">{metrics.edicao}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Em Edição</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Entregues */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
        >
          <Card className="metric-card hover:border-success/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-success/10">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-8" />
                ) : (
                  <span className="text-2xl font-bold">{metrics.entregues}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Entregues (mês)</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Receita */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <Card className="metric-card hover:border-success/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-success/10">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <span className="text-lg font-bold text-success">{formatCurrency(metrics.receita)}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Receita (mês)</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Custos */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="metric-card hover:border-destructive/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-destructive/10">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <span className="text-lg font-bold text-destructive">{formatCurrency(metrics.custos)}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Custos (mês)</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Lucro */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <Card className="metric-card border-primary/20 hover:border-primary/40 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/15">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <span className={cn(
                    "text-lg font-bold",
                    metrics.lucro >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    {formatCurrency(metrics.lucro)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Lucro (mês)</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Financial Chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              Evolução Financeira (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    name="Receita"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                  />
                  <Area
                    type="monotone"
                    dataKey="custos"
                    name="Custos"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCustos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    name="Lucro"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorLucro)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid - Equal height cards */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Urgent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="glass-card h-[280px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 shrink-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                </div>
                Projetos Urgentes
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary h-7 text-xs px-2" 
                onClick={() => navigate('/app/projetos?filter=urgentes')}
              >
                Ver todos
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-2">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : urgentProjects.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Nenhum projeto urgente 🎉
                  </div>
                ) : (
                  <div className="space-y-2">
                    {urgentProjects.slice(0, 5).map((project) => {
                      const TypeIcon = getTypeIcon(project.type);
                      return (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group border border-transparent hover:border-primary/10"
                          onClick={() => handleProjectClick(project)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
                              <TypeIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{project.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{project.client}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {project.date && (
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                {format(new Date(project.date), 'dd/MM')}
                              </span>
                            )}
                            <Badge variant="outline" className={cn('text-[10px] capitalize px-2 py-0.5 h-5', getPriorityColor(project.priority))}>
                              {project.priority}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Stacked cards with equal distribution */}
        <div className="flex flex-col gap-3">
          {/* Pending Payments */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex-1"
          >
            <Card className="glass-card h-full min-h-[130px]">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  Pagamentos Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center justify-between">
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-warning">{formatCurrency(metrics.pendingPayments)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {metrics.pendingPaymentsCount} pagamento(s) por receber
                      </p>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs px-3" 
                    onClick={() => navigate('/app/pagamentos')}
                  >
                    Ver
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1"
          >
            <Card className="glass-card h-full min-h-[130px]">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-info/10">
                    <Clock className="h-4 w-4 text-info" />
                  </div>
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[80px] pr-2">
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                      ))}
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      Nenhuma atividade recente
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.slice(0, 4).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-2 py-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-tight">
                              <span className="font-medium">{activity.action}</span>
                              {' '}
                              <span className="text-muted-foreground">{activity.target}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Project Details Modal */}
      <ProjectDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        project={selectedProject}
        onUpdate={refresh}
      />
    </div>
  );
}
