import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Inbox, Search, TrendingUp, Users, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ListPagination } from '@/components/ui/list-pagination';

import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useTransactionFeed,
  type FinanceTx,
  type FinanceTxKind,
} from '@/hooks/useTransactionFeed';

import { Money } from '@/components/finance/Money';
import { DateCell } from '@/components/finance/DateCell';
import { FilterChip } from '@/components/finance/FilterChip';
import {
  paymentStatusLabels as statusLabels,
  paymentStatusColors as statusColors,
} from '@/lib/finance/constants';
import { cn } from '@/lib/utils';

type KindFilter = 'all' | FinanceTxKind;
type StatusFilter = 'all' | 'pendente' | 'pago' | 'vencido' | 'cancelado';

const KIND_OPTIONS: { id: KindFilter; label: string; icon: typeof TrendingUp }[] = [
  { id: 'all',     label: 'Todos',        icon: Inbox },
  { id: 'revenue', label: 'Receitas',     icon: TrendingUp },
  { id: 'team',    label: 'Colaboradores', icon: Users },
  { id: 'extra',   label: 'Custos extras', icon: Package },
];

const kindTone: Record<FinanceTxKind, 'income' | 'expense'> = {
  revenue: 'income',
  team: 'expense',
  extra: 'expense',
};

const kindBadgeStyle: Record<FinanceTxKind, string> = {
  revenue: 'bg-success/10 text-success border-success/25',
  team:    'bg-primary/10 text-primary border-primary/25',
  extra:   'bg-warning/10 text-warning border-warning/30',
};

const kindShortLabel: Record<FinanceTxKind, string> = {
  revenue: 'Receita',
  team:    'Equipa',
  extra:   'Extra',
};

const PAGE_SIZE = 20;

/**
 * Unified transaction feed. Merges revenues, collaborator payments and extra costs
 * into a single sortable/filterable stream, backed by useTransactionFeed.
 */
export default function Movimentos() {
  const { transactions, loading } = useTransactionFeed();
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebounce(rawSearch, 200);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (kind !== 'all' && t.kind !== kind) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (q) {
        const hay = `${t.projectName} ${t.projectCode ?? ''} ${t.detail} ${t.clientName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, kind, status, search]);

  const counts = useMemo(() => {
    const c: Record<KindFilter, number> = { all: transactions.length, revenue: 0, team: 0, extra: 0 };
    transactions.forEach((t) => {
      c[t.kind] += 1;
    });
    return c;
  }, [transactions]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filtered.forEach((t) => {
      if (t.kind === 'revenue') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, net: income - expense };
  }, [filtered]);

  const pagination = usePagination({
    items: filtered,
    itemsPerPage: PAGE_SIZE,
  });

  const paged = pagination.paginatedItems;

  const anyFilter = kind !== 'all' || status !== 'all' || !!search;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Totals band */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Entradas</p>
            <Money value={totals.income} tone="income" className="text-lg sm:text-xl mt-1 block" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Saídas</p>
            <Money value={totals.expense} tone="expense" className="text-lg sm:text-xl mt-1 block" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Saldo</p>
            <Money value={totals.net} tone="profit" sign className="text-lg sm:text-xl mt-1 block" />
          </CardContent>
        </Card>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder="Procurar por projeto, cliente ou colaborador..."
            className="pl-9 h-9"
            aria-label="Procurar movimentos"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kind chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {KIND_OPTIONS.map((o) => (
          <FilterChip
            key={o.id}
            label={o.label}
            count={counts[o.id]}
            active={kind === o.id}
            onClick={() => setKind(o.id)}
          />
        ))}
      </div>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          {paged.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Inbox}
                title={anyFilter ? 'Sem resultados' : 'Sem movimentos'}
                description={
                  anyFilter
                    ? 'Ajusta os filtros para veres mais transações.'
                    : 'Assim que entregares projetos, os movimentos aparecem aqui.'
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="w-[110px]">Data</TableHead>
                  <TableHead className="w-[90px]">Tipo</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead className="hidden md:table-cell">Detalhe</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="w-[130px] text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((t, i) => (
                  <TransactionRow key={t.key} tx={t} delay={i * 0.015} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ListPagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        hasNextPage={pagination.hasNextPage}
        hasPreviousPage={pagination.hasPreviousPage}
        onPageChange={pagination.goToPage}
        onNextPage={pagination.goToNextPage}
        onPreviousPage={pagination.goToPreviousPage}
        onFirstPage={pagination.goToFirstPage}
        onLastPage={pagination.goToLastPage}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------

function TransactionRow({ tx, delay }: { tx: FinanceTx; delay: number }) {
  const statusKey = (tx.status || 'pendente') as keyof typeof statusLabels;
  const label = statusLabels[statusKey] || statusKey;
  const color = statusColors[statusKey] || 'bg-muted text-muted-foreground';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay }}
      className="border-border/60 hover:bg-muted/30 transition-colors"
    >
      <TableCell className="text-xs text-muted-foreground">
        <DateCell date={tx.date} format="short" />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px] font-medium border', kindBadgeStyle[tx.kind])}>
          {kindShortLabel[tx.kind]}
        </Badge>
      </TableCell>
      <TableCell className="min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{tx.projectName}</span>
          <span className="text-[11px] text-muted-foreground truncate">
            {tx.projectCode ? `${tx.projectCode} · ` : ''}
            {tx.clientName || '—'}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[220px]">
        {tx.detail}
      </TableCell>
      <TableCell>
        <Select
          value={tx.status || 'pendente'}
          onValueChange={(v) => tx.updateStatus(v)}
        >
          <SelectTrigger
            className={cn(
              'h-7 w-[110px] text-[11px] font-medium border-0 gap-1',
              color,
            )}
          >
            <SelectValue>{label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <Money value={tx.amount} tone={kindTone[tx.kind]} className="text-sm" />
      </TableCell>
    </motion.tr>
  );
}
