import { BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatDurationLong, type ProjectTimeSummary } from '@/hooks/useTimeTracking';

interface ColumnTimeBreakdownProps {
  summary: ProjectTimeSummary;
}

export function ColumnTimeBreakdown({ summary }: ColumnTimeBreakdownProps) {
  const breakdown = summary.column_breakdown || [];
  
  if (breakdown.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-3">
        Sem dados de tempo por coluna
      </p>
    );
  }

  const maxSeconds = Math.max(...breakdown.map(c => c.total_seconds), 1);

  return (
    <div className="space-y-2">
      {breakdown
        .sort((a, b) => b.total_seconds - a.total_seconds)
        .map((col) => (
        <div key={col.column_id} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">{col.column_name}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{formatDurationLong(col.total_seconds)}</span>
              <span className="text-[10px]">{col.entry_count}×</span>
            </div>
          </div>
          <Progress 
            value={(col.total_seconds / maxSeconds) * 100} 
            className="h-1.5" 
          />
        </div>
      ))}
    </div>
  );
}
