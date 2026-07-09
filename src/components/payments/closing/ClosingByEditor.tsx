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
          {byEditor.map((e) => (
            <div key={e.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{e.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {e.cards} card{e.cards !== 1 ? 's' : ''} · Pago {formatCurrency(e.paid)}
                </p>
              </div>
              <span className={cn('font-semibold text-sm text-destructive shrink-0', hideValues && 'blur-md select-none')}>
                {formatCurrency(e.payable)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
