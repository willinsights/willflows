import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWorkspaceStorage } from '@/hooks/useWorkspaceStorage';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StorageWarningBadgeProps {
  collapsed?: boolean;
}

/**
 * Sidebar warning shown only when storage usage > 90%.
 * Click navigates to Settings → Storage.
 */
export function StorageWarningBadge({ collapsed = false }: StorageWarningBadgeProps) {
  const { storage, loading } = useWorkspaceStorage();
  const navigate = useNavigate();

  if (loading || storage.percentUsed <= 90) return null;

  const isFull = storage.isFull;
  const label = isFull ? 'Storage cheio' : 'Storage quase cheio';
  const detail = `${storage.usedGB.toFixed(1)} GB / ${storage.limitGB.toFixed(0)} GB (${Math.round(storage.percentUsed)}%)`;

  const handleClick = () => navigate('/app/configuracoes?tab=storage');

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              aria-label={`${label} — ${detail}`}
              className={cn(
                'mx-auto flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
                'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20',
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {label} — {detail}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
        'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15',
      )}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="font-semibold leading-tight">{label}</span>
        <span className="truncate text-[10px] opacity-80">{detail}</span>
      </div>
    </motion.button>
  );
}
