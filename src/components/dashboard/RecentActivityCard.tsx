import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecentActivity } from '@/hooks/useDashboardMetrics';

interface RecentActivityCardProps {
  recentActivity: RecentActivity[];
  loading: boolean;
}

export function RecentActivityCard({ recentActivity, loading }: RecentActivityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex-1"
    >
      <Card className="glass-card h-full min-h-[180px]">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-info/10">
              <Clock className="h-4 w-4 text-info" />
            </div>
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ScrollArea className="h-[110px] pr-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Clock className="h-5 w-5 text-muted-foreground/50 mb-1" />
                <p className="text-xs text-muted-foreground">Nenhuma atividade recente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-tight">
                        <span className="font-medium">{activity.action}</span>
                        {' '}
                        <span className="text-muted-foreground">{activity.target}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
