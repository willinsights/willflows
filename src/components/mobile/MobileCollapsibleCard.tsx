import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileCollapsibleCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  defaultExpanded?: boolean;
  preview?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MobileCollapsibleCard({
  title,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  defaultExpanded = false,
  preview,
  children,
  className,
}: MobileCollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn('glass-card overflow-hidden', className)}>
      <CardHeader 
        className="py-3 px-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md', iconBg)}>
              <Icon className={cn('h-4 w-4', iconColor)} />
            </div>
            {title}
          </CardTitle>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
        
        {/* Preview content when collapsed */}
        <AnimatePresence>
          {!isExpanded && preview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2"
            >
              {preview}
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <CardContent className="px-4 pb-4 pt-0">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
