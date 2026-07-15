import { AlertTriangle, ArrowRight, CircleCheck, Clock, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface FinanceAlert {
  id: string;
  icon: 'overdue' | 'closing' | 'due';
  label: string;
  count?: number;
  onClick?: () => void;
}

const iconMap = {
  overdue: AlertTriangle,
  closing: Receipt,
  due: Clock,
};

export function AlertsWidget({ alerts }: { alerts: FinanceAlert[] }) {
  const visible = alerts.filter((a) => (a.count ?? 1) > 0);

  if (visible.length === 0) {
    return (
      <Card className="glass-card h-full border-success/25 bg-gradient-to-br from-success/[0.05] to-transparent">
        <CardContent className="p-4 h-full flex flex-col items-center justify-center gap-2 text-center">
          <CircleCheck className="h-8 w-8 text-success/80" />
          <p className="text-sm font-medium">Tudo em dia</p>
          <p className="text-xs text-muted-foreground">
            Sem alertas financeiros neste momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="glass-card h-full border-warning/25 bg-gradient-to-br from-warning/[0.05] to-transparent"
      aria-live="polite"
    >
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-1.5 mb-3">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Alertas
          </span>
        </div>
        <ul className="space-y-1 flex-1">
          {visible.map((a) => {
            const Icon = iconMap[a.icon];
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={a.onClick}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-left',
                    'hover:bg-background/60 focus-visible:bg-background/60 outline-none transition-colors group',
                  )}
                >
                  <Icon className="h-4 w-4 text-warning shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{a.label}</span>
                  {a.count != null && (
                    <span className="tabular-nums text-xs font-semibold text-warning">
                      {a.count}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
