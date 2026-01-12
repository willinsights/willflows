import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface DashboardHeaderProps {
  currentTime: Date;
}

export function DashboardHeader({ currentTime }: DashboardHeaderProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

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
    </motion.div>
  );
}
