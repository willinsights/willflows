import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useSubscriptionDiscrepancies,
  type SubscriptionDiscrepancy,
} from '@/hooks/useSubscriptionDiscrepancies';

export function SubscriptionReconciliationTab() {
  const {
    discrepancies,
    activeCount,
    isLoading,
    resolve,
    isResolving,
    runReconciliation,
    isRunning,
  } = useSubscriptionDiscrepancies();
  const [selected, setSelected] = useState<SubscriptionDiscrepancy | null>(null);
  const [notes, setNotes] = useState('');

  const open = (d: SubscriptionDiscrepancy) => {
    setSelected(d);
    setNotes(d.notes || '');
  };

  const handleResolve = () => {
    if (!selected) return;
    resolve(
      { id: selected.id, notes: notes.trim() },
      {
        onSuccess: () => {
          setSelected(null);
          setNotes('');
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Reconciliação Stripe
              {activeCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {activeCount} ativa{activeCount === 1 ? '' : 's'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Divergências detetadas entre o estado da subscrição no Stripe e o estado guardado na
              base de dados. O job corre automaticamente todos os dias às 03:15 UTC.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runReconciliation()}
            disabled={isRunning}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            Correr agora
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success" />
            <p>Sem divergências registadas. Tudo sincronizado.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Workspace / Utilizador</TableHead>
                <TableHead>Stripe → DB</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Detetada</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discrepancies.map((d) => {
                const isResolved = !!d.resolved_at;
                const wsName = (d.details as any)?.workspace_name;
                const email = (d.details as any)?.user_email;
                return (
                  <TableRow key={d.id} className={isResolved ? 'opacity-50' : ''}>
                    <TableCell>
                      {isResolved ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolvida
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Ativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{wsName || email || '—'}</div>
                      {wsName && email && (
                        <div className="text-xs text-muted-foreground">{email}</div>
                      )}
                      {d.stripe_subscription_id && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {d.stripe_subscription_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">
                        {d.stripe_status || '—'} → {d.db_status || '—'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {d.discrepancy_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(d.detected_at), 'dd MMM HH:mm', { locale: pt })}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isResolved && (
                        <Button size="sm" variant="ghost" onClick={() => open(d)}>
                          Marcar como resolvida
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver divergência</DialogTitle>
            <DialogDescription>
              Adiciona uma nota a explicar como esta divergência foi corrigida (opcional).
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Stripe sub:</span>{' '}
                <code className="text-xs">{selected.stripe_subscription_id}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Estados:</span>{' '}
                <code className="text-xs">
                  {selected.stripe_status} → {selected.db_status}
                </code>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas de resolução..."
                rows={4}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button onClick={handleResolve} disabled={isResolving}>
              Confirmar resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
