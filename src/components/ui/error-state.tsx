import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Estado de erro padronizado para usar em páginas/secções quando
 * uma query falha ou um recurso não pode ser carregado.
 */
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Ocorreu um erro ao tentar obter os dados. Tenta novamente.',
  icon: Icon = AlertCircle,
  onRetry,
  retryLabel = 'Tentar novamente',
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-destructive/10 flex items-center justify-center mb-4',
          compact ? 'w-12 h-12' : 'w-16 h-16'
        )}
      >
        <Icon
          className={cn(
            'text-destructive',
            compact ? 'h-6 w-6' : 'h-8 w-8'
          )}
        />
      </div>
      <h3
        className={cn(
          'font-semibold mb-2',
          compact ? 'text-base' : 'text-lg'
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'text-muted-foreground max-w-sm',
          compact ? 'text-sm mb-3' : 'mb-4'
        )}
      >
        {description}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {retryLabel}
        </Button>
      )}
    </motion.div>
  );
}
