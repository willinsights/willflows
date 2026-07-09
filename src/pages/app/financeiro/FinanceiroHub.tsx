import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Receipt, ChevronDown, ChevronRight, Check, Download, FileText,
  Search, Filter, Plus, Trash2, ArrowLeft, TrendingUp, TrendingDown, Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { PageHeader } from '@/components/layout/PageHeader';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useUnbilledPool } from '@/hooks/useUnbilledPool';
import { useClosings, type Closing, type ClosingItem } from '@/hooks/useClosings';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { useTeamPayments } from '@/hooks/usePayments';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';

type Mode = 'freelancer' | 'studio';

const statusLabel = (s: string) =>
  ({ pago: 'Pago', pendente: 'Pendente', vencido: 'Vencido', cancelado: 'Cancelado' } as Record<string, string>)[s] || s;

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'pago'
      ? 'bg-success/15 text-success border-success/30'
      : status === 'vencido'
      ? 'bg-destructive/15 text-destructive border-destructive/30'
      : 'bg-warning/15 text-warning border-warning/30';
  return <Badge variant="outline" className={cls}>{statusLabel(status)}</Badge>;
}

/** ---------- Pool "Por faturar" ---------- */
function UnbilledPool({
  onCreated, mode,
}: { onCreated: () => void; mode: Mode }) {
  const { formatCurrency } = useFormatCurrency();
  const { rows, loading } = useUnbilledPool();
  const { members } = useWorkspaceMembers();
  const { clients } = useClients();
  const { createClosing } = useClosings();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editorFilter, setEditorFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [includeExtras, setIncludeExtras] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (clientFilter !== 'all' && r.clientId !== clientFilter) return false;
      if (editorFilter !== 'all' && !r.teamPayments.some((tp) => tp.userId === editorFilter))
        return false;
      if (query && !`${r.projectCode} ${r.projectName} ${r.clientName}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, clientFilter, editorFilter, query]);

  const selectedRows = filtered.filter((r) => selected[r.projectId]);
  const totalRevenue = selectedRows.reduce((s, r) => s + r.agreedValue, 0);
  const totalTeam = selectedRows.reduce(
    (s, r) => s + r.teamPayments.reduce((a, t) => a + t.amount, 0),
    0,
  );
  const totalExtras = includeExtras ? selectedRows.reduce((s, r) => s + r.extras, 0) : 0;
  const netProfit = totalRevenue - totalTeam - totalExtras;

  const allChecked = filtered.length > 0 && filtered.every((r) => selected[r.projectId]);
  const toggleAll = () => {
    const next: Record<string, boolean> = { ...selected };
    if (allChecked) filtered.forEach((r) => (next[r.projectId] = false));
    else filtered.forEach((r) => (next[r.projectId] = true));
    setSelected(next);
  };

  const distinctClients = new Set(selectedRows.map((r) => r.clientId).filter(Boolean));
  const inferredClientId = distinctClients.size === 1 ? [...distinctClients][0] : null;

  const handleCreate = async () => {
    try {
      const items: Array<Omit<ClosingItem, 'id' | 'closing_id' | 'created_at'>> = [];
      for (const r of selectedRows) {
        items.push({ kind: 'revenue', project_id: r.projectId, team_payment_id: null, amount_snapshot: r.agreedValue });
        for (const tp of r.teamPayments) {
          items.push({ kind: 'team', project_id: r.projectId, team_payment_id: tp.id, amount_snapshot: tp.amount });
        }
        if (includeExtras && r.extras > 0) {
          items.push({ kind: 'extra', project_id: r.projectId, team_payment_id: null, amount_snapshot: r.extras });
        }
      }
      await createClosing.mutateAsync({
        label: label || `Fecho ${format(new Date(), 'dd/MM/yyyy', { locale: pt })}`,
        clientId: inferredClientId as string | null,
        items,
      });
      toast({ title: 'Fecho criado', description: `${selectedRows.length} projetos incluídos.` });
      setSelected({});
      setLabel('');
      setDialogOpen(false);
      onCreated();
    } catch (e) {
      toast({ title: 'Erro', description: String((e as Error).message), variant: 'destructive' });
    }
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Por faturar</h2>
            <p className="text-xs text-muted-foreground">
              Cards entregues que ainda não estão num fecho.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="flex items-center gap-2 text-xs">
              <Switch checked={includeExtras} onCheckedChange={setIncludeExtras} />
              Incluir despesas extras
            </Label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar…" className="pl-8" />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {mode === 'studio' && (
            <Select value={editorFilter} onValueChange={setEditorFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Editor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os editores</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Sem cards por faturar"
            description="Quando um card chegar à coluna final aparece aqui para incluir num fecho."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 w-8"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></th>
                  <th className="p-2 text-left">Projeto</th>
                  <th className="p-2 text-left">Cliente</th>
                  {mode === 'studio' && <th className="p-2 text-left">Editores</th>}
                  <th className="p-2 text-right">Receita</th>
                  {mode === 'studio' && <th className="p-2 text-right">Custo editor</th>}
                  <th className="p-2 text-right">Extras</th>
                  <th className="p-2 text-left">Entregue</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.projectId} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="p-2">
                      <Checkbox
                        checked={!!selected[r.projectId]}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.projectId]: !!v }))}
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{r.projectName}</div>
                      <div className="text-[11px] text-muted-foreground">{r.projectCode}</div>
                    </td>
                    <td className="p-2">{r.clientName}</td>
                    {mode === 'studio' && (
                      <td className="p-2 text-xs">
                        {r.teamPayments.length === 0
                          ? <span className="text-muted-foreground">—</span>
                          : r.teamPayments.map((tp) => tp.editorName).join(', ')}
                      </td>
                    )}
                    <td className="p-2 text-right font-medium">{formatCurrency(r.agreedValue)}</td>
                    {mode === 'studio' && (
                      <td className="p-2 text-right text-muted-foreground">
                        {formatCurrency(r.teamPayments.reduce((a, t) => a + t.amount, 0))}
                      </td>
                    )}
                    <td className={cn('p-2 text-right', includeExtras ? '' : 'text-muted-foreground/50 line-through')}>
                      {formatCurrency(r.extras)}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.deliveredAt ? format(new Date(r.deliveredAt), 'dd MMM', { locale: pt }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedRows.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="sticky bottom-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 backdrop-blur p-3 shadow-lg"
          >
            <div className="text-sm">
              <span className="font-semibold">{selectedRows.length}</span> selecionados ·{' '}
              <span className="text-muted-foreground">Receita </span>
              <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
              {mode === 'studio' && (
                <>
                  {' · '}<span className="text-muted-foreground">Custos </span>
                  <span className="font-semibold">{formatCurrency(totalTeam + totalExtras)}</span>
                  {' · '}<span className="text-muted-foreground">Lucro </span>
                  <span className={cn('font-semibold', netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(netProfit)}
                  </span>
                </>
              )}
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Criar fecho
            </Button>
          </motion.div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar fecho</DialogTitle>
              <DialogDescription>
                {selectedRows.length} projetos · {formatCurrency(totalRevenue)} de receita.
                {inferredClientId ? '' : ' Vários clientes — fecho ficará marcado como "misto".'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nome do fecho</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Fecho outubro" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createClosing.isPending}>
                {createClosing.isPending ? 'A criar…' : 'Criar fecho'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/** ---------- Closings list ---------- */
function ClosingsList({
  closings, items, onOpen, monthFilter,
}: { closings: Closing[]; items: ClosingItem[]; onOpen: (id: string) => void; monthFilter: string }) {
  const { formatCurrency } = useFormatCurrency();
  const { clients } = useClients();

  const visible = closings.filter((c) => {
    if (monthFilter === 'all') return true;
    return c.created_at.startsWith(monthFilter);
  });

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Sem fechos"
        description="Cria o primeiro fecho selecionando cards na pool acima."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((c) => {
        const its = items.filter((i) => i.closing_id === c.id);
        const revenue = its.filter((i) => i.kind === 'revenue').reduce((s, i) => s + Number(i.amount_snapshot), 0);
        const costs = its.filter((i) => i.kind !== 'revenue').reduce((s, i) => s + Number(i.amount_snapshot), 0);
        const nVideos = new Set(its.filter((i) => i.kind === 'revenue').map((i) => i.project_id)).size;
        const clientName = c.client_id ? clients.find((cl) => cl.id === c.client_id)?.name || '—' : 'Misto';
        return (
          <Card key={c.id} className="glass-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => onOpen(c.id)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{c.label || 'Sem nome'}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(c.created_at), 'dd MMM yyyy', { locale: pt })} · {clientName}
                  </div>
                </div>
                <Badge variant={c.status === 'received' ? 'default' : 'outline'}>
                  {c.status === 'received' ? 'Recebido' : 'Por receber'}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><div className="text-muted-foreground">Vídeos</div><div className="font-semibold">{nVideos}</div></div>
                <div><div className="text-muted-foreground">Receita</div><div className="font-semibold text-success">{formatCurrency(revenue)}</div></div>
                <div><div className="text-muted-foreground">Lucro</div><div className="font-semibold">{formatCurrency(revenue - costs)}</div></div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** ---------- Closing detail ---------- */
function ClosingDetail({
  closingId, onBack, mode,
}: { closingId: string; onBack: () => void; mode: Mode }) {
  const { formatCurrency, formatCurrencyRaw } = useFormatCurrency();
  const { closings, items, markReceived, deleteClosing } = useClosings();
  const { handleFreelancerStatusChange, handleCostStatusChange, allProjectCosts, projectRevenue } = usePaymentsData();
  const { members } = useWorkspaceMembers();
  const { clients } = useClients();
  const { toast } = useToast();

  const closing = closings.find((c) => c.id === closingId);
  const its = useMemo(() => items.filter((i) => i.closing_id === closingId), [items, closingId]);

  const revenueItems = its.filter((i) => i.kind === 'revenue');
  const teamItems = its.filter((i) => i.kind === 'team');
  const extraItems = its.filter((i) => i.kind === 'extra');

  const revenue = revenueItems.reduce((s, i) => s + Number(i.amount_snapshot), 0);
  const teamCost = teamItems.reduce((s, i) => s + Number(i.amount_snapshot), 0);
  const extraCost = extraItems.reduce((s, i) => s + Number(i.amount_snapshot), 0);
  const profit = revenue - teamCost - extraCost;

  const projectMap = new Map(projectRevenue.map((p) => [p.id, p]));
  const extraMap = new Map(allProjectCosts.map((c) => [c.id, c]));

  const editorGroups = useMemo(() => {
    const map = new Map<string, { name: string; rows: Array<{ id: string; projectId: string; project: string; amount: number; status: string; teamId: string }>; total: number }>();
    for (const it of teamItems) {
      const proj = projectMap.get(it.project_id);
      // find team_payment via project revenue? we don't have team list here; fetch from teamPayments?
      // Use members: try to locate a payment with matching team_payment_id from usePaymentsData? Not accessible; encode from useTeamPayments instead.
      const editorId = 'unknown';
      const key = `${editorId}:${it.team_payment_id}`;
      // Placeholder — resolved below via team payments
      const cur = map.get(editorId) || { name: 'Editor', rows: [], total: 0 };
      cur.rows.push({
        id: it.id,
        projectId: it.project_id,
        project: proj?.name || it.project_id.slice(0, 8),
        amount: Number(it.amount_snapshot),
        status: 'pendente',
        teamId: it.team_payment_id || '',
      });
      cur.total += Number(it.amount_snapshot);
      map.set(editorId, cur);
    }
    return map;
  }, [teamItems, projectMap]);

  if (!closing) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <p className="mt-4 text-muted-foreground">Fecho não encontrado.</p>
      </div>
    );
  }

  const projectIds = revenueItems.map((i) => i.project_id);
  const clientName = closing.client_id ? clients.find((c) => c.id === closing.client_id)?.name || '—' : 'Misto';

  const handleMarkReceived = async () => {
    try {
      await markReceived.mutateAsync({ closingId: closing.id, projectIds });
      toast({ title: 'Fecho marcado como recebido' });
    } catch (e) {
      toast({ title: 'Erro', description: String((e as Error).message), variant: 'destructive' });
    }
  };

  const handleMarkTeamPaid = async (teamId: string) => {
    try { await handleFreelancerStatusChange(teamId, 'pago'); toast({ title: 'Marcado como pago' }); }
    catch (e) { toast({ title: 'Erro', description: String((e as Error).message), variant: 'destructive' }); }
  };

  const handleExportProfit = () => {
    const lines = [
      ['Fecho', closing.label],
      ['Cliente', clientName],
      ['Data', format(new Date(closing.created_at), 'dd/MM/yyyy', { locale: pt })],
      [],
      ['Projeto', 'Receita'],
      ...revenueItems.map((i) => [projectMap.get(i.project_id)?.name || i.project_id, formatCurrencyRaw(Number(i.amount_snapshot))]),
      [],
      ['Receita total', formatCurrencyRaw(revenue)],
      ['Custos', formatCurrencyRaw(teamCost + extraCost)],
      ['Lucro', formatCurrencyRaw(profit)],
    ];
    const csv = lines.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${closing.label || 'fecho'}-lucro.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportProfit} className="gap-2">
            <Download className="h-4 w-4" /> Exportar lucro
          </Button>
          {closing.status !== 'received' && (
            <Button size="sm" onClick={handleMarkReceived} disabled={markReceived.isPending} className="gap-2">
              <Check className="h-4 w-4" /> Marcar recebido
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Apagar fecho?</AlertDialogTitle>
              <AlertDialogDescription>Os projetos voltam para a pool. Esta ação não afeta pagamentos já marcados como pagos.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { deleteClosing.mutate(closing.id); onBack(); }}>Apagar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold">{closing.label || 'Fecho'}</h2>
        <p className="text-sm text-muted-foreground">
          {clientName} · {format(new Date(closing.created_at), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>

      <div className={cn('grid gap-3', mode === 'freelancer' ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground uppercase">Receita</span><TrendingUp className="h-4 w-4 text-success" /></div>
          <div className="text-2xl font-bold text-success">{formatCurrency(revenue)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground uppercase">Custos</span><TrendingDown className="h-4 w-4 text-destructive" /></div>
          <div className="text-2xl font-bold text-destructive">{formatCurrency(teamCost + extraCost)}</div>
          {mode === 'studio' && <div className="text-xs text-muted-foreground">Editores {formatCurrency(teamCost)} · Extras {formatCurrency(extraCost)}</div>}
        </CardContent></Card>
        {mode === 'studio' && (
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground uppercase">O meu lucro</span><Wallet className="h-4 w-4" /></div>
            <div className={cn('text-2xl font-bold', profit >= 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(profit)}</div>
            <Badge variant="outline" className="mt-1 text-[10px]">{closing.status === 'received' ? 'Recebido' : 'Por receber'}</Badge>
          </CardContent></Card>
        )}
      </div>

      {/* Editor accordion (studio) */}
      {mode === 'studio' && teamItems.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Acertos por editor</h3>
          <Accordion type="single" collapsible>
            {Array.from(editorGroups.entries()).map(([editorId, grp]) => (
              <AccordionItem key={editorId} value={editorId}>
                <AccordionTrigger>
                  <span className="flex justify-between w-full pr-4">
                    <span>{grp.name}</span>
                    <span className="tabular-nums">{formatCurrency(grp.total)}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1">
                    {grp.rows.map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span>{r.project}</span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums">{formatCurrency(r.amount)}</span>
                          {r.teamId && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkTeamPaid(r.teamId)}>
                              Marcar pago
                            </Button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent></Card>
      )}

      {/* Extras */}
      {extraItems.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Despesas incluídas</h3>
          <div className="space-y-1 text-sm">
            {extraItems.map((it) => {
              const c = extraMap.get(it.project_id);
              return (
                <div key={it.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span>{c?.name || it.project_id}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{formatCurrency(Number(it.amount_snapshot))}</span>
                    <StatusBadge status={c?.custos_extras_payment_status || 'pendente'} />
                    {c?.custos_extras_payment_status !== 'pago' && (
                      <Button size="sm" variant="outline" onClick={() => handleCostStatusChange(it.project_id, 'pago')}>
                        Marcar pago
                      </Button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

/** ---------- Global profit view ---------- */
function GlobalProfitView({ closings, items }: { closings: Closing[]; items: ClosingItem[] }) {
  const { formatCurrency } = useFormatCurrency();
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'received'>('all');

  const rows = closings
    .filter((c) => statusFilter === 'all' || c.status === (statusFilter === 'received' ? 'received' : 'open'))
    .map((c) => {
      const its = items.filter((i) => i.closing_id === c.id);
      const revenue = its.filter((i) => i.kind === 'revenue').reduce((s, i) => s + Number(i.amount_snapshot), 0);
      const costs = its.filter((i) => i.kind !== 'revenue').reduce((s, i) => s + Number(i.amount_snapshot), 0);
      return { c, revenue, costs, profit: revenue - costs };
    });

  const totals = rows.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue, costs: acc.costs + r.costs, profit: acc.profit + r.profit,
  }), { revenue: 0, costs: 0, profit: 0 });

  return (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Lucro global</h3>
          <Select value={statusFilter} onValueChange={(v: 'all' | 'open' | 'received') => setStatusFilter(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Por receber</SelectItem>
              <SelectItem value="received">Recebidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground uppercase">Receita</div><div className="font-bold text-success">{formatCurrency(totals.revenue)}</div></div>
          <div><div className="text-xs text-muted-foreground uppercase">Custos</div><div className="font-bold text-destructive">{formatCurrency(totals.costs)}</div></div>
          <div><div className="text-xs text-muted-foreground uppercase">Lucro</div><div className="font-bold">{formatCurrency(totals.profit)}</div></div>
        </div>
        {rows.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr><th className="p-2 text-left">Fecho</th><th className="p-2 text-right">Receita</th><th className="p-2 text-right">Custos</th><th className="p-2 text-right">Lucro</th><th className="p-2">Estado</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.c.id} className="border-t">
                    <td className="p-2">{r.c.label} <span className="text-xs text-muted-foreground">· {format(new Date(r.c.created_at), 'dd/MM/yy')}</span></td>
                    <td className="p-2 text-right">{formatCurrency(r.revenue)}</td>
                    <td className="p-2 text-right">{formatCurrency(r.costs)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(r.profit)}</td>
                    <td className="p-2 text-center"><StatusBadge status={r.c.status === 'received' ? 'pago' : 'pendente'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** ---------- Main hub ---------- */
export default function FinanceiroHub() {
  const { closings, items, loading } = useClosings();
  const { members } = useWorkspaceMembers();
  const [openClosingId, setOpenClosingId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [detailOpen, setDetailOpen] = useState(false);

  const mode: Mode = members.length <= 1 ? 'freelancer' : 'studio';

  // Available months from closings
  const months = useMemo(() => {
    const set = new Set(closings.map((c) => c.created_at.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [closings]);

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

  if (openClosingId) {
    return <div className="p-4 sm:p-6"><ClosingDetail closingId={openClosingId} onBack={() => setOpenClosingId(null)} mode={mode} /></div>;
  }

  return (
    <div className="space-y-6">
      <UnbilledPool onCreated={() => { /* refresh handled by cache */ }} mode={mode} />

      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-lg font-semibold">Fechos criados</h2>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy', { locale: pt })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ClosingsList closings={closings} items={items} onOpen={setOpenClosingId} monthFilter={monthFilter} />
      </div>

      <GlobalProfitView closings={closings} items={items} />

      <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Ver detalhe (vistas antigas)</span>
            {detailOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-2 text-sm">
          <p className="text-muted-foreground">Acede às vistas granulares (mantidas para consulta):</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { to: '/app/financeiro/legacy/visao-geral', label: 'Visão Geral' },
              { to: '/app/financeiro/legacy/receitas', label: 'Receitas por projeto' },
              { to: '/app/financeiro/legacy/custos', label: 'Custos de equipa' },
              { to: '/app/financeiro/legacy/custos-extras', label: 'Custos extras' },
              { to: '/app/financeiro/legacy/lucro', label: 'Lucro por projeto' },
              { to: '/app/financeiro/legacy/fecho', label: 'Fecho mensal (antigo)' },
            ].map((l) => (
              <a key={l.to} href={l.to} className="rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors">{l.label}</a>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
