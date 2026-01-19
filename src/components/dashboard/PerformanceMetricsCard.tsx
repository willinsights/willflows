import { motion } from 'framer-motion';
import { Target, PieChart, TrendingUp, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';

export interface PerformanceMetrics {
  deliveryRate: number;
  avgDeliveryDays: number;
  avgMargin: number;
  projectsByType: {
    fotografia: number;
    video: number;
    foto_video: number;
  };
}

interface PerformanceMetricsCardProps {
  metrics: PerformanceMetrics;
  loading: boolean;
}

export function PerformanceMetricsCard({ metrics, loading }: PerformanceMetricsCardProps) {
  const { canViewAllFinancials } = useFinancialPermissions();

  // Se não for admin, não mostra o card
  if (!canViewAllFinancials) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="h-full opacity-60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/50">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              Métricas de Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[140px] flex flex-col items-center justify-center text-center">
              <Lock className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">Apenas administradores</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const totalProjects = metrics.projectsByType.fotografia + metrics.projectsByType.video + metrics.projectsByType.foto_video;
  
  const typePercentages = totalProjects > 0 ? {
    fotografia: Math.round((metrics.projectsByType.fotografia / totalProjects) * 100),
    video: Math.round((metrics.projectsByType.video / totalProjects) * 100),
    foto_video: Math.round((metrics.projectsByType.foto_video / totalProjects) * 100),
  } : { fotografia: 0, video: 0, foto_video: 0 };

  // Métricas sem "Tempo Médio de Entrega"
  const performanceItems = [
    {
      label: 'Taxa de Entrega',
      value: `${metrics.deliveryRate}%`,
      icon: Target,
      progress: metrics.deliveryRate,
      color: metrics.deliveryRate >= 80 ? 'text-success' : metrics.deliveryRate >= 50 ? 'text-warning' : 'text-destructive',
      progressColor: metrics.deliveryRate >= 80 ? 'bg-success' : metrics.deliveryRate >= 50 ? 'bg-warning' : 'bg-destructive',
    },
    {
      label: 'Margem Média',
      value: `${metrics.avgMargin}%`,
      icon: TrendingUp,
      progress: Math.min(metrics.avgMargin, 100),
      color: metrics.avgMargin >= 30 ? 'text-success' : metrics.avgMargin >= 15 ? 'text-warning' : 'text-destructive',
      progressColor: metrics.avgMargin >= 30 ? 'bg-success' : metrics.avgMargin >= 15 ? 'bg-warning' : 'bg-destructive',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="h-full bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            Métricas de Desempenho
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {performanceItems.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <span className={cn("text-sm font-semibold", item.color)}>{item.value}</span>
                  </div>
                  {item.progress !== undefined && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", item.progressColor)}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Projects by Type */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Projetos por Tipo</p>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                  {typePercentages.fotografia > 0 && (
                    <div 
                      className="bg-primary h-full transition-all" 
                      style={{ width: `${typePercentages.fotografia}%` }}
                      title={`Fotografia: ${typePercentages.fotografia}%`}
                    />
                  )}
                  {typePercentages.video > 0 && (
                    <div 
                      className="bg-info h-full transition-all" 
                      style={{ width: `${typePercentages.video}%` }}
                      title={`Vídeo: ${typePercentages.video}%`}
                    />
                  )}
                  {typePercentages.foto_video > 0 && (
                    <div 
                      className="bg-success h-full transition-all" 
                      style={{ width: `${typePercentages.foto_video}%` }}
                      title={`Foto+Vídeo: ${typePercentages.foto_video}%`}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Foto {typePercentages.fotografia}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-info" />
                    Vídeo {typePercentages.video}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Ambos {typePercentages.foto_video}%
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
