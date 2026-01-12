import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AlertCircle, ArrowRight, CheckCircle2, Camera, Film } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { UrgentProject } from '@/hooks/useDashboardMetrics';

interface UrgentProjectsCardProps {
  urgentProjects: UrgentProject[];
  loading: boolean;
  onProjectClick: (project: UrgentProject) => void;
}

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

export function UrgentProjectsCard({ urgentProjects, loading, onProjectClick }: UrgentProjectsCardProps) {
  const navigate = useNavigate();

  return (
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
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <p className="text-sm font-medium text-success">Tudo em dia! 🎉</p>
                <p className="text-xs text-muted-foreground mt-1">Nenhum projeto urgente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentProjects.slice(0, 5).map((project) => {
                  const TypeIcon = getTypeIcon(project.type);
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group border border-transparent hover:border-primary/10"
                      onClick={() => onProjectClick(project)}
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
  );
}
