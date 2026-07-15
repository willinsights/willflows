import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Money } from '@/components/finance/Money';
import { DateCell } from '@/components/finance/DateCell';
import { useTransactionFeed, type FinanceTx } from '@/hooks/useTransactionFeed';
import { cn } from '@/lib/utils';

interface CollabAgg {
  key: string;
  name: string;
  avatarUrl: string | null;
  pending: number;
  paid: number;
  overdue: number;
  total: number;
  txs: FinanceTx[];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Colaboradores() {
  const { transactions, loading } = useTransactionFeed();
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const collaborators = useMemo<CollabAgg[]>(() => {
    const acc: Record<string, CollabAgg> = {};
    transactions
      .filter((t) => t.kind === 'team')
      .forEach((t) => {
        // detail = "Nome · Fase"
        const name = t.detail.split(' · ')[0] || 'Colaborador';
        const key = name;
        if (!acc[key]) {
          acc[key] = {
            key,
            name,
            avatarUrl: null,
            pending: 0,
            paid: 0,
            overdue: 0,
            total: 0,
            txs: [],
          };
        }
        const agg = acc[key];
        agg.total += t.amount;
        if (t.status === 'pago') agg.paid += t.amount;
        else if (t.status === 'vencido') agg.overdue += t.amount;
        else if (t.status !== 'cancelado') agg.pending += t.amount;
        agg.txs.push(t);
      });
    return Object.values(acc).sort((a, b) => b.pending - a.pending || b.total - a.total);
  }, [transactions]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return collaborators;
    return collaborators.filter((c) => c.name.toLowerCase().includes(term));
  }, [collaborators, q]);

  const totals = useMemo(() => {
    return collaborators.reduce(
      (acc, c) => {
        acc.pending += c.pending;
        acc.paid += c.paid;
        acc.overdue += c.overdue;
        return acc;
      },
      { pending: 0, paid: 0, overdue: 0 },
    );
  }, [collaborators]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sem colaboradores com pagamentos"
        description="Assim que projetos entregues tiverem equipa atribuída, os totais por colaborador aparecem aqui."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Totals band */}
      <Card className="glass-card">
        <CardContent className="grid grid-cols-3 divide-x divide-border p-0">
          <div className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Por pagar</p>
            <Money value={totals.pending} className="text-2xl font-bold text-warning" />
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Vencido</p>
            <Money value={totals.overdue} className="text-2xl font-bold text-destructive" />
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pago</p>
            <Money value={totals.paid} className="text-2xl font-bold text-success" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar colaborador..."
          className="pl-9 h-9"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const isOpen = !!expanded[c.key];
          return (
            <Card key={c.key} className="glass-card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded((s) => ({ ...s, [c.key]: !s[c.key] }))}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.name} />}
                  <AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.txs.length} pagamento{c.txs.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="hidden sm:grid grid-cols-3 gap-6 text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Por pagar</p>
                    <Money value={c.pending} className={cn('text-sm font-semibold', c.pending > 0 && 'text-warning')} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vencido</p>
                    <Money value={c.overdue} className={cn('text-sm font-semibold', c.overdue > 0 && 'text-destructive')} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pago</p>
                    <Money value={c.paid} className="text-sm font-semibold text-success" />
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border bg-muted/20">
                  <div className="divide-y divide-border">
                    {c.txs.map((t) => (
                      <div key={t.key} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{t.projectName}</p>
                            {t.projectCode && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {t.projectCode}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{t.detail}</p>
                        </div>
                        {t.date && <DateCell date={t.date} className="text-xs text-muted-foreground w-20 text-right" />}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            t.status === 'pago' && 'border-success text-success',
                            t.status === 'vencido' && 'border-destructive text-destructive',
                            t.status === 'pendente' && 'border-warning text-warning',
                          )}
                        >
                          {t.status ?? 'pendente'}
                        </Badge>
                        <Money value={t.amount} className="w-24 text-right font-semibold" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end p-3">
                    <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                      <Link to={`/app/financeiro?tab=movimentos&q=${encodeURIComponent(c.name)}`}>
                        Ver em Movimentos <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem resultados para "{q}".
          </p>
        )}
      </div>
    </div>
  );
}
