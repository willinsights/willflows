import { Card, CardContent } from '@/components/ui/card';
import { Money } from './Money';

export interface TopClient {
  id: string;
  name: string;
  revenue: number;
  projects: number;
}

export function TopClientsWidget({ clients }: { clients: TopClient[] }) {
  const top = clients.slice(0, 5);
  const max = Math.max(...top.map((c) => c.revenue), 1);

  return (
    <Card className="glass-card h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <h3 className="text-sm font-semibold mb-3">Top clientes</h3>
        {top.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados no período selecionado.</p>
        ) : (
          <ul className="space-y-2.5 flex-1">
            {top.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">
                    {c.name}
                    <span className="text-[11px] text-muted-foreground ml-1.5">
                      · {c.projects}
                    </span>
                  </span>
                  <Money value={c.revenue} tone="income" className="text-xs" />
                </div>
                <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-success/70 rounded-full"
                    style={{ width: `${(c.revenue / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
