import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecentActivity } from '@/hooks/useDashboardMetrics';

interface MobileRecentActivityProps {
  recentActivity: RecentActivity[];
  loading: boolean;
  maxItems?: number;
}

export function MobileRecentActivity({ 
  recentActivity, 
  loading,
  maxItems = 4,
}: MobileRecentActivityProps) {
  const displayedActivity = recentActivity.slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card className="glass-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-info/10">
              <Clock className="h-4 w-4 text-info" />
            </div>
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/20"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">
                      <span className="font-medium">{activity.action}</span>
                      {' '}
                      <span className="text-muted-foreground">{activity.target}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
