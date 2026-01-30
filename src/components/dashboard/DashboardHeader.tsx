import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useHideValues } from '@/hooks/useHideValues';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DashboardHeaderProps {
  currentTime: Date;
}

export function DashboardHeader({ currentTime }: DashboardHeaderProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { hideValues, toggleHideValues } = useHideValues();

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 19) return 'Boa tarde';
    return 'Boa noite';
  };

  const userName = user?.user_metadata?.full_name || currentWorkspace?.name || 'Utilizador';
  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM", { locale: pt });
  const formattedTime = format(currentTime, 'HH:mm');

  return (
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHideValues}
            className="h-8 w-8 p-0 self-start sm:self-auto"
          >
            {hideValues ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{hideValues ? 'Mostrar valores' : 'Esconder valores'}</p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
