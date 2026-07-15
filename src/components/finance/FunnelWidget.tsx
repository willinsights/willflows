import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function FunnelWidget({
  delivered,
  closed,
  received,
  title = 'Funil de faturação',
}: {
  delivered: number;
  closed: number;
  received: number;
  title?: string;
}) {
  const max = Math.max(delivered, closed, received, 1);
  const stages = [
    { label: 'Entregues', value: delivered, tone: 'bg-muted-foreground/40' },
    { label: 'Em fecho',  value: closed,    tone: 'bg-primary/70' },
    { label: 'Recebidos', value: received,  tone: 'bg-success/80' },
  ];

  return (
    <Card className="glass-card h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <h3 className="text-sm font-semibold mb-3">{title}</h3>
        <div className="space-y-3 flex-1">
          {stages.map((s) => {
            const pct = Math.round((s.value / max) * 100);
            return (
              <div key={s.label}>
                <div className="flex items-baseline justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="tabular-nums font-semibold">{s.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', s.tone)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {delivered === 0 && (
          <p className="text-[11px] text-muted-foreground mt-3">
            Sem projetos entregues no período selecionado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
