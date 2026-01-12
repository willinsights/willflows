import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center mb-4',
          compact ? 'w-12 h-12' : 'w-16 h-16'
        )}
      >
        <Icon
          className={cn(
            'text-muted-foreground',
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
      {action && (
        <Button
          className="gradient-primary"
          size={compact ? 'sm' : 'default'}
          onClick={action.onClick}
        >
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
