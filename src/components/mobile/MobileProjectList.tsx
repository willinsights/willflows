import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AlertCircle, Camera, Film, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { UrgentProject } from '@/hooks/useDashboardMetrics';

interface MobileProjectListProps {
  projects: UrgentProject[];
  loading: boolean;
  onProjectClick: (project: UrgentProject) => void;
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgente': return 'bg-destructive text-destructive-foreground';
    case 'alta': return 'bg-warning text-warning-foreground';
    case 'media': return 'bg-info text-info-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'video': return Film;
    case 'fotografia': return Camera;
    default: return Camera;
  }
};

export function MobileProjectList({ 
  projects, 
  loading, 
  onProjectClick, 
  title = 'Projetos Urgentes',
  emptyMessage = 'Nenhum projeto urgente',
  maxItems = 4 
}: MobileProjectListProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
          </div>
          <h2 className="font-semibold">{title}</h2>
        </div>
        {projects.length > 0 && (
          <button 
            onClick={() => navigate('/app/captacao?priority=urgente,alta')}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="bg-success/5 border-success/20">
          <CardContent className="py-6 text-center">
            <p className="text-success font-medium">Tudo em dia! 🎉</p>
            <p className="text-xs text-muted-foreground mt-1">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {projects.slice(0, maxItems).map((project) => {
            const TypeIcon = getTypeIcon(project.type);
            return (
              <button
                key={project.id}
                onClick={() => onProjectClick(project)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <TypeIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{project.client}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge className={cn('text-[10px] px-2 py-0.5', getPriorityColor(project.priority))}>
                    {project.priority}
                  </Badge>
                  {project.date && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(project.date), 'dd/MM')}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
