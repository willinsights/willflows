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
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { SeedDemoData } from '@/components/demo/SeedDemoData';

// Placeholder data - will be replaced with real data later
const mockMetrics = {
  captacao: 5,
  edicao: 8,
  entregues: 12,
  receita: 8500,
  custos: 2300,
  lucro: 6200,
};

const mockUrgentProjects = [
  { id: '1', name: 'Casamento Silva', client: 'Ana Silva', date: '2026-01-10', type: 'video', priority: 'urgente' },
  { id: '2', name: 'Hotel Cascais', client: 'Grupo Pestana', date: '2026-01-12', type: 'foto', priority: 'alta' },
  { id: '3', name: 'Evento Tech Summit', client: 'TechCorp', date: '2026-01-15', type: 'foto_video', priority: 'media' },
];

const mockRecentActivity = [
  { id: '1', action: 'Projeto criado', target: 'Casamento Silva', time: 'Há 2 horas', user: 'João' },
  { id: '2', action: 'Tarefa concluída', target: 'Edição vídeo promo', time: 'Há 4 horas', user: 'Maria' },
  { id: '3', action: 'Cliente adicionado', target: 'TechCorp', time: 'Há 6 horas', user: 'João' },
  { id: '4', action: 'Pagamento registado', target: 'Grupo Pestana', time: 'Ontem', user: 'João' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [currentTime, setCurrentTime] = useState(new Date());

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
    }).format(value);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'alta': return 'bg-warning/10 text-warning border-warning/20';
      case 'media': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Film;
      case 'foto': return Camera;
      default: return Camera;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">
            {getGreeting()}, {userName.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground capitalize">
            {formattedDate} — {formattedTime}
          </p>
        </div>
        <SeedDemoData />
      </motion.div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Camera className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{mockMetrics.captacao}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Em Captação</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Film className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{mockMetrics.edicao}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Em Edição</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">{mockMetrics.entregues}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Entregues</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">{formatCurrency(mockMetrics.receita)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Receita</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{formatCurrency(mockMetrics.custos)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Custos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">Lucro</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(mockMetrics.lucro)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Este mês</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Urgent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Projetos Urgentes
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockUrgentProjects.map((project) => {
                  const TypeIcon = getTypeIcon(project.type);
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                          <TypeIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{project.client}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(project.date), 'dd/MM')}
                          </div>
                        </div>
                        <Badge variant="outline" className={cn('capitalize', getPriorityColor(project.priority))}>
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payments Pending & Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-6"
        >
          {/* Pending Payments */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Pagamentos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-warning">{formatCurrency(3500)}</p>
                <p className="text-sm text-muted-foreground mt-1">3 pagamentos por receber</p>
              </div>
              <Button variant="outline" className="w-full mt-2">
                Ver pagamentos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-3">
                  {mockRecentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.action}</span>
                          {' '}
                          <span className="text-muted-foreground">{activity.target}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.time} • {activity.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
