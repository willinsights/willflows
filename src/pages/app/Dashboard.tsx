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
  Calendar,
  Clock,
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
import { useProductTour } from '@/hooks/useProductTour';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showTour, completeTour, skipTour } = useProductTour();
  const { metrics, urgentProjects, recentActivity, loading } = useDashboardMetrics();

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
  const formattedDate = format(currentTime, "EEEE, d MMM", { locale: pt });
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1600px] mx-auto">
      {/* Product Tour */}
      {showTour && (
        <ProductTour onComplete={completeTour} onSkip={skipTour} />
      )}

      {/* Header - Compact */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            {getGreeting()}, {userName.split(' ')[0]}!
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground capitalize">
            {formattedDate} • {formattedTime}
          </p>
        </div>
      </motion.div>

      {/* Metrics Grid - 6 columns on desktop, 3 on tablet, 2 on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Captação */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="metric-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <Camera className="h-4 w-4 text-primary" />
                {loading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="text-xl font-bold">{metrics.captacao}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Em Captação</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edição */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="metric-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <Film className="h-4 w-4 text-primary" />
                {loading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="text-xl font-bold">{metrics.edicao}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Em Edição</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Entregues */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="metric-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {loading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="text-xl font-bold">{metrics.entregues}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Entregues</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Receita */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="metric-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="h-4 w-4 text-success" />
                {loading ? (
                  <Skeleton className="h-6 w-14" />
                ) : (
                  <span className="text-lg font-bold">{formatCurrency(metrics.receita)}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Receita</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Custos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="metric-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <TrendingDown className="h-4 w-4 text-destructive" />
                {loading ? (
                  <Skeleton className="h-6 w-14" />
                ) : (
                  <span className="text-lg font-bold">{formatCurrency(metrics.custos)}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Custos</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Lucro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="metric-card border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-primary uppercase">Lucro</span>
                {loading ? (
                  <Skeleton className="h-6 w-14" />
                ) : (
                  <span className={cn(
                    "text-lg font-bold",
                    metrics.lucro >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    {formatCurrency(metrics.lucro)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Urgent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card h-full">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Projetos Urgentes
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary h-7 text-xs" onClick={() => navigate('/app/captacao')}>
                Ver todos
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : urgentProjects.length === 0 ? (
                <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
                  Nenhum projeto urgente 🎉
                </div>
              ) : (
                <div className="space-y-2">
                  {urgentProjects.slice(0, 4).map((project) => {
                    const TypeIcon = getTypeIcon(project.type);
                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/app/captacao')}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                            <TypeIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{project.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{project.client}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {project.date && (
                            <span className="text-[11px] text-muted-foreground hidden sm:block">
                              {format(new Date(project.date), 'dd/MM')}
                            </span>
                          )}
                          <Badge variant="outline" className={cn('text-[10px] capitalize px-1.5 py-0', getPriorityColor(project.priority))}>
                            {project.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Pending Payments */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Pagamentos Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-center py-2">
                  {loading ? (
                    <Skeleton className="h-8 w-24 mx-auto" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-warning">{formatCurrency(metrics.pendingPayments)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {metrics.pendingPaymentsCount} pagamentos por receber
                      </p>
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => navigate('/app/pagamentos')}>
                  Ver pagamentos
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="glass-card">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[160px] pr-2">
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                      Nenhuma atividade recente
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] leading-tight">
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
    </div>
  );
}
