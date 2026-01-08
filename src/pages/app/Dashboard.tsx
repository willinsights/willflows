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
  Wallet,
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

      {/* Header - Compact */}
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

      {/* KPIs Row - 6 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Captação */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <Card className="metric-card hover:border-primary/30">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                </div>
                {loading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="text-xl font-bold">{metrics.captacao}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Em Captação</p>
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
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-md bg-info/10">
                  <Film className="h-3.5 w-3.5 text-info" />
                </div>
                {loading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="text-xl font-bold">{metrics.edicao}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Em Edição</p>
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
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-md bg-success/10">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                </div>
                {loading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="text-xl font-bold">{metrics.entregues}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Entregues (mês)</p>
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
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-md bg-success/10">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                </div>
                {loading ? (
                  <Skeleton className="h-5 w-14" />
                ) : (
                  <span className="text-base font-bold text-success">{formatCurrency(metrics.receita)}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Receita</p>
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
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-md bg-destructive/10">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                </div>
                {loading ? (
                  <Skeleton className="h-5 w-14" />
                ) : (
                  <span className="text-base font-bold text-destructive">{formatCurrency(metrics.custos)}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Custos</p>
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
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-md bg-primary/15">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                </div>
                {loading ? (
                  <Skeleton className="h-5 w-14" />
                ) : (
                  <span className={cn(
                    "text-base font-bold",
                    metrics.lucro >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    {formatCurrency(metrics.lucro)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Lucro (mês)</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-5 gap-3">
        {/* Urgent Projects - Takes 3 columns */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          <Card className="glass-card h-full">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-3">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
                Projetos Urgentes
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary h-6 text-[10px] px-2" 
                onClick={() => navigate('/app/captacao')}
              >
                Ver todos
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {loading ? (
                <div className="space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : urgentProjects.length === 0 ? (
                <div className="flex items-center justify-center h-14 text-xs text-muted-foreground">
                  Nenhum projeto urgente 🎉
                </div>
              ) : (
                <div className="space-y-1.5">
                  {urgentProjects.slice(0, 5).map((project) => {
                    const TypeIcon = getTypeIcon(project.type);
                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer group"
                        onClick={() => navigate('/app/captacao')}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
                            <TypeIcon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium truncate">{project.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{project.client}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {project.date && (
                            <span className="text-[10px] text-muted-foreground hidden sm:block">
                              {format(new Date(project.date), 'dd/MM')}
                            </span>
                          )}
                          <Badge variant="outline" className={cn('text-[9px] capitalize px-1.5 py-0 h-4', getPriorityColor(project.priority))}>
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

        {/* Right Column - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-3">
          {/* Pending Payments */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="glass-card">
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-primary" />
                  Pagamentos Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex items-center justify-between">
                  {loading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <div>
                      <p className="text-xl font-bold text-warning">{formatCurrency(metrics.pendingPayments)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {metrics.pendingPaymentsCount} pagamento(s) por receber
                      </p>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] px-2" 
                    onClick={() => navigate('/app/pagamentos')}
                  >
                    Ver
                    <ArrowRight className="ml-1 h-3 w-3" />
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
          >
            <Card className="glass-card">
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ScrollArea className="h-[140px] pr-2">
                  {loading ? (
                    <div className="space-y-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="flex items-center justify-center h-14 text-[11px] text-muted-foreground">
                      Nenhuma atividade recente
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {recentActivity.slice(0, 6).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-1.5 py-1">
                          <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] leading-tight">
                              <span className="font-medium">{activity.action}</span>
                              {' '}
                              <span className="text-muted-foreground">{activity.target}</span>
                            </p>
                            <p className="text-[9px] text-muted-foreground">{activity.time}</p>
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
