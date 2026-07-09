import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useHideValues } from '@/hooks/useHideValues';
import { paymentStatusColors, paymentStatusLabels } from '@/lib/finance/constants';
import type { ClosingSettlement } from '@/hooks/useMonthlyClosing';
import { EmptyState } from '@/components/ui/empty-state';

interface Props {
  settlements: ClosingSettlement[];
  formatCurrency: (n: number) => string;
  hideEditorColumn?: boolean;
}

const typeLabels: Record<ClosingSettlement['type'], string> = {
  editor: 'Edição',
  extra: 'Custo extra',
};

export function ClosingSettlementsTable({ settlements, formatCurrency, hideEditorColumn }: Props) {
  const { hideValues } = useHideValues();

  if (settlements.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8">
          <EmptyState
            icon={Receipt}
            title="Sem acertos neste fecho"
            description="Ainda não há projetos entregues neste mês."
            compact
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Acertos
          <Badge variant="secondary" className="ml-auto">{settlements.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {settlements.map((s) => (
            <div key={s.key} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-muted-foreground">{s.projectCode}</p>
                  <p className="font-medium text-sm truncate">{s.projectName}</p>
                  {!hideEditorColumn && (
                    <p className="text-xs text-muted-foreground truncate">{s.editorName}</p>
                  )}
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', paymentStatusColors[s.status])}>
                  {paymentStatusLabels[s.status] || s.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {typeLabels[s.type]}
                </span>
                <span className={cn('font-semibold text-sm', hideValues && 'blur-md select-none')}>
                  {formatCurrency(s.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Projeto</TableHead>
                {!hideEditorColumn && <TableHead>Editor</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((s) => (
                <TableRow key={s.key}>
                  <TableCell className="font-mono text-xs">{s.projectCode}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{s.projectName}</TableCell>
                  {!hideEditorColumn && <TableCell>{s.editorName}</TableCell>}
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{typeLabels[s.type]}</Badge>
                  </TableCell>
                  <TableCell className={cn('text-right font-semibold', hideValues && 'blur-md select-none')}>
                    {formatCurrency(s.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', paymentStatusColors[s.status])}>
                      {paymentStatusLabels[s.status] || s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
