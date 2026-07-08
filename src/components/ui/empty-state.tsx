import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  /** Optional secondary action rendered as an outline button next to the primary. */
  secondaryAction?: EmptyStateAction;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
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
      {/* Gradient-ring icon container */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center mb-4',
          'bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10',
          'ring-1 ring-inset ring-primary/15 shadow-sm',
          compact ? 'w-14 h-14' : 'w-20 h-20'
        )}
      >
        <Icon
          className={cn(
            'text-primary/60',
            compact ? 'h-6 w-6' : 'h-9 w-9'
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
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
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
          {secondaryAction && (
            <Button
              variant="outline"
              size={compact ? 'sm' : 'default'}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4 mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
