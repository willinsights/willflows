import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHideValues } from '@/hooks/useHideValues';
import type { EditorSummary } from '@/hooks/useMonthlyClosing';

interface Props {
  byEditor: EditorSummary[];
  formatCurrency: (n: number) => string;
}

export function ClosingByEditor({ byEditor, formatCurrency }: Props) {
  const { hideValues } = useHideValues();
  if (byEditor.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Por editor
          <Badge variant="secondary" className="ml-auto">{byEditor.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {byEditor.map((e) => {
            const isFixedMonthly = e.cards > 0 && e.payable === 0 && e.paid === 0;
            return (
              <div key={e.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{e.name}</p>
                    {isFixedMonthly && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary shrink-0">
                        mensal fixo
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {e.cards} card{e.cards !== 1 ? 's' : ''}
                    {isFixedMonthly ? ' · custo já no card' : ` · Pago ${formatCurrency(e.paid)}`}
                  </p>
                </div>
                <span className={cn('font-semibold text-sm shrink-0', isFixedMonthly ? 'text-muted-foreground' : 'text-destructive', hideValues && 'blur-md select-none')}>
                  {formatCurrency(e.payable)}
                </span>
              </div>
            );
          })}

        </div>
      </CardContent>
    </Card>
  );
}
