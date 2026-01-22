import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type ResourceType = 'workspaces' | 'users' | 'projects' | 'clients';

interface UsageLimitBannerProps {
  resource: ResourceType;
  current: number;
  limit: number;
  className?: string;
}

const resourceLabels: Record<ResourceType, { singular: string; plural: string }> = {
  workspaces: { singular: 'workspace', plural: 'workspaces' },
  users: { singular: 'utilizador', plural: 'utilizadores' },
  projects: { singular: 'projeto', plural: 'projetos' },
  clients: { singular: 'cliente', plural: 'clientes' },
};

export function UsageLimitBanner({ resource, current, limit, className }: UsageLimitBannerProps) {
  const navigate = useNavigate();
  const percentage = Math.min((current / limit) * 100, 100);
  const remaining = Math.max(0, limit - current);
  
  // Determine alert level
  const getAlertLevel = () => {
    if (percentage >= 100) return 'blocked';
    if (percentage >= 90) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'normal';
  };
  
  const alertLevel = getAlertLevel();
  
  // Don't show banner if usage is below 80%
  if (alertLevel === 'normal') return null;
  
  const labels = resourceLabels[resource];
  
  const getMessage = () => {
    switch (alertLevel) {
      case 'blocked':
        return `Limite de ${labels.plural} atingido!`;
      case 'critical':
        return `Apenas ${remaining} ${remaining === 1 ? labels.singular : labels.plural} restante${remaining === 1 ? '' : 's'}`;
      case 'warning':
        return `${remaining} ${remaining === 1 ? labels.singular : labels.plural} disponíve${remaining === 1 ? 'l' : 'is'}`;
    }
  };
  
  const getColors = () => {
    switch (alertLevel) {
      case 'blocked':
        return {
          bg: 'bg-destructive/10 border-destructive/30',
          text: 'text-destructive',
          progress: 'bg-destructive',
          icon: 'text-destructive',
        };
      case 'critical':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30',
          text: 'text-orange-600 dark:text-orange-400',
          progress: 'bg-orange-500',
          icon: 'text-orange-500',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30',
          text: 'text-yellow-700 dark:text-yellow-400',
          progress: 'bg-yellow-500',
          icon: 'text-yellow-500',
        };
    }
  };
  
  const colors = getColors();
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'rounded-lg border p-3 flex items-center justify-between gap-4',
          colors.bg,
          className
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn('flex-shrink-0', colors.icon)}>
            {alertLevel === 'blocked' ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <TrendingUp className="h-5 w-5" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', colors.text)}>
              {getMessage()}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Progress 
                value={percentage} 
                className="h-1.5 flex-1 bg-background/50"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {current}/{limit}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          size="sm" 
          variant={alertLevel === 'blocked' ? 'default' : 'outline'}
          className="flex-shrink-0 gap-1.5"
          onClick={() => navigate('/app/planos')}
        >
          <Zap className="h-3.5 w-3.5" />
          Upgrade
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for sidebar or small spaces
export function UsageLimitCompact({ resource, current, limit, className }: UsageLimitBannerProps) {
  const navigate = useNavigate();
  const percentage = Math.min((current / limit) * 100, 100);
  
  const alertLevel = percentage >= 100 ? 'blocked' : percentage >= 90 ? 'critical' : percentage >= 80 ? 'warning' : 'normal';
  
  if (alertLevel === 'normal') return null;
  
  const colors = {
    blocked: 'text-destructive',
    critical: 'text-orange-500',
    warning: 'text-yellow-500',
    normal: 'text-muted-foreground',
  };
  
  return (
    <button
      onClick={() => navigate('/app/planos')}
      className={cn(
        'flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-muted/50 transition-colors',
        colors[alertLevel],
        className
      )}
      title={`${current}/${limit} ${resourceLabels[resource].plural}`}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>{current}/{limit}</span>
    </button>
  );
}