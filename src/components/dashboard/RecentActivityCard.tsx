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
      <Card className="glass-card h-full min-h-[220px] flex flex-col">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex-1 min-h-0">
          <ScrollArea className="h-full pr-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6">
                <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Nada por aqui</p>
                <p className="text-xs text-muted-foreground mt-0.5">Nenhuma atividade recente</p>
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
                      <p className="text-[10px] text-muted-foreground tabular-nums">{activity.time}</p>
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
