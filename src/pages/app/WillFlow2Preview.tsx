import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Database, Eye, Lock, RefreshCw, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

// Read-only private preview. It reuses the live session and workspace RLS.
// IMPORTANT: Never serve project/client/payment data from static public demos.
type ViewName = 'Projetos' | 'Clientes' | 'Vídeos' | 'Pagamentos' | 'Faturação' | 'Contratos' | 'Armazenamento';
type PreviewRecord = { id: string; title: string; subtitle: string; status: string; detail: string; value?: number | null };
type Snapshot = { workspaceId: string; lists: Record<ViewName, PreviewRecord[]>; counts: Record<ViewName, number>; errors: Partial<Record<ViewName, string>> };
const views: ViewName[] = ['Projetos', 'Clientes', 'Vídeos', 'Pagamentos', 'Faturação', 'Contratos', 'Armazenamento'];
const routes: Record<ViewName, string> = {
  Projetos: '/app/captacao', Clientes: '/app/clientes', Vídeos: '/app/media',
  Pagamentos: '/app/pagamentos', Faturação: '/app/faturacao',
  Contratos: '/app/contratos', Armazenamento: '/app/configuracoes',
};
const blank = (): Record<ViewName, PreviewRecord[]> => ({
  Projetos: [], Clientes: [], Vídeos: [], Pagamentos: [],
  Faturação: [], Contratos: [], Armazenamento: [],
});
const readable = (value: string | number | boolean | null | undefined) =>
  value === null || value === undefined || value === '' ? 'Sem informação' : String(value);
const formatBytes = (value: number) => value >= 1024 ** 3
  ? (value / 1024 ** 3).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) + ' GB'
  : (value / 1024 ** 2).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) + ' MB';

export default function WillFlow2Preview() {
  const { workspace, membership, loading: workspaceLoading } = useWorkspace();
  // Access control is double-gated: membership check here, existing Supabase RLS on every SELECT.
  const allowed = Boolean(
    workspace && membership && membership.workspace_id === workspace.id &&
    membership.is_active && membership.role === 'admin',
  );
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [limits, setLimits] = useState<Record<ViewName, number>>(() => ({
    Projetos: 50, Clientes: 50, Vídeos: 50, Pagamentos: 50,
    Faturação: 50, Contratos: 50, Armazenamento: 1,
  }));
  const [tab, setTab] = useState<ViewName>('Projetos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PreviewRecord | null>(null);

  const refresh = useCallback(() => setRevision(x => x + 1), []);
  useEffect(() => {
    if (!allowed || !workspace) { setSnapshot(null); return; }
    let cancelled = false;
    const workspaceId = workspace.id;
    setLoading(true);
    setSnapshot(null); // Never show previous workspace data while switching tenants.
    setSelected(null);
    const collect = async () => {
      // Only explicitly needed fields; never SELECT *, raw content, private tokens, IPs or emails.
      // All queries are filtered by active workspace and executed with the signed-in user's RLS.
      const [projects, clients, videos, payments, invoices, contracts, storage] = await Promise.all([
        supabase.from('projects').select('id,name,current_phase,agreed_value,delivery_date,is_delivered,created_at', { count: 'exact' })
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(limits.Projetos),
        supabase.from('clients').select('id,name,company,is_active,created_at', { count: 'exact' })
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(limits.Clientes),
        supabase.from('video_versions').select('id,file_name,version_number,stream_status,is_deleted,created_at', { count: 'exact' })
          .eq('workspace_id', workspaceId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(limits.Vídeos),
        supabase.from('payments').select('id,description,amount,status,is_receivable,due_date,created_at', { count: 'exact' })
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(limits.Pagamentos),
        supabase.from('invoices').select('id,invoice_number,total,status,issue_date', { count: 'exact' })
          .eq('workspace_id', workspaceId).order('issue_date', { ascending: false }).limit(limits.Faturação),
        supabase.from('contracts').select('id,title,status,total_value,created_at', { count: 'exact' })
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(limits.Contratos),
        supabase.from('workspace_storage').select('id,storage_used_bytes,storage_limit_bytes,extra_storage_bytes')
          .eq('workspace_id', workspaceId).maybeSingle(),
      ]);
      const errors: Partial<Record<ViewName, string>> = {};
      if (projects.error) errors.Projetos = 'A leitura de projetos não foi autorizada.';
      if (clients.error) errors.Clientes = 'A leitura de clientes não foi autorizada.';
      if (videos.error) errors.Vídeos = 'A leitura de versões de vídeo não foi autorizada.';
      if (payments.error) errors.Pagamentos = 'A leitura de pagamentos não foi autorizada.';
      if (invoices.error) errors.Faturação = 'A leitura de faturas não foi autorizada.';
      if (contracts.error) errors.Contratos = 'A leitura de contratos não foi autorizada.';
      if (storage.error) errors.Armazenamento = 'A leitura de armazenamento não foi autorizada.';
      const lists: Record<ViewName, PreviewRecord[]> = {
        Projetos: (projects.data ?? []).map(p => ({
          id: p.id, title: p.name, subtitle: readable(p.current_phase),
          status: p.is_delivered ? 'Entregue' : readable(p.current_phase),
          detail: 'Entrega: ' + readable(p.delivery_date), value: p.agreed_value,
        })),
        Clientes: (clients.data ?? []).map(c => ({
          id: c.id, title: c.name, subtitle: readable(c.company),
          status: c.is_active ? 'Ativo' : 'Inativo', detail: 'Cliente do workspace',
        })),
        Vídeos: (videos.data ?? []).map(v => ({
          id: v.id, title: v.file_name, subtitle: 'Versão ' + v.version_number,
          status: readable(v.stream_status), detail: 'Criado: ' + v.created_at.slice(0, 10),
        })),
        Pagamentos: (payments.data ?? []).map(p => ({
          id: p.id, title: p.description || 'Pagamento', subtitle: p.is_receivable ? 'A receber' : 'A pagar',
          status: readable(p.status), detail: 'Vencimento: ' + readable(p.due_date), value: p.amount,
        })),
        Faturação: (invoices.data ?? []).map(i => ({
          id: i.id, title: i.invoice_number, subtitle: 'Data: ' + readable(i.issue_date),
          status: readable(i.status), detail: 'Documento de faturação', value: i.total,
        })),
        Contratos: (contracts.data ?? []).map(c => ({
          id: c.id, title: c.title, subtitle: 'Contrato',
          status: readable(c.status), detail: 'Registo contratual', value: c.total_value,
        })),
        Armazenamento: storage.data ? [{
          id: storage.data.id, title: 'Armazenamento contratado', subtitle: formatBytes(storage.data.storage_used_bytes) + ' em utilização',
          status: 'Leitura atual', detail: 'Limite total: ' + formatBytes(storage.data.storage_limit_bytes) +
            ' · Extra já incluído: ' + formatBytes(storage.data.extra_storage_bytes),
        }] : [],
      };
      const counts: Record<ViewName, number> = {
        Projetos: projects.count ?? lists.Projetos.length,
        Clientes: clients.count ?? lists.Clientes.length,
        Vídeos: videos.count ?? lists.Vídeos.length,
        Pagamentos: payments.count ?? lists.Pagamentos.length,
        Faturação: invoices.count ?? lists.Faturação.length,
        Contratos: contracts.count ?? lists.Contratos.length,
        Armazenamento: lists.Armazenamento.length,
      };
      if (!cancelled) setSnapshot({ workspaceId, lists, counts, errors });
    };
    void collect().catch(() => {
      if (!cancelled) setSnapshot({
        workspaceId, lists: blank(), counts: { Projetos: 0, Clientes: 0, Vídeos: 0, Pagamentos: 0, Faturação: 0, Contratos: 0, Armazenamento: 0 }, errors: Object.fromEntries(views.map(v => [v, 'Falha de ligação. Tenta atualizar.'])) as Partial<Record<ViewName, string>>,
      });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [allowed, workspace?.id, revision, limits]);

  const rows = snapshot?.workspaceId === workspace?.id ? snapshot.lists[tab] : [];
  const filtered = useMemo(() => (rows ?? []).filter(x =>
    (x.title + ' ' + x.subtitle + ' ' + x.status).toLocaleLowerCase('pt-PT')
      .includes(search.toLocaleLowerCase('pt-PT')),
  ), [rows, search]);
  const currency = (amount: number | null | undefined) => amount === null || amount === undefined
    ? '' : new Intl.NumberFormat('pt-PT', {
      style: 'currency', currency: workspace?.currency || 'EUR', maximumFractionDigits: 0,
    }).format(amount);

  if (workspaceLoading) return <div className="p-6 text-muted-foreground">A validar a sessão e o workspace…</div>;
  if (!allowed) return <div className="mx-auto max-w-xl p-8 space-y-4">
    <Lock className="h-8 w-8 text-muted-foreground" />
    <h1 className="text-2xl font-bold">Pré-visualização privada</h1>
    <p className="text-muted-foreground">Esta área utiliza dados reais e está reservada aos administradores autenticados do workspace.</p>
    <Button asChild variant="outline"><Link to="/app"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao WillFlow</Link></Button>
  </div>;

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-600">
          <Eye className="h-4 w-4" /> WILLFLOW 2.0 · PRÉ-VISUALIZAÇÃO PRIVADA
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Os teus dados reais, numa nova visão</h1>
        <p className="text-sm text-muted-foreground">{workspace?.name} · Consulta sem alterações aos registos</p>
      </div>
      <div className="flex gap-2"><Button variant="outline" onClick={refresh} disabled={loading}>
        <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
      </Button><Button asChild variant="outline"><Link to="/app"><ArrowLeft className="mr-2 h-4 w-4" />App atual</Link></Button></div>
    </div>
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950 dark:bg-violet-950/20 dark:text-violet-200 dark:border-violet-900">
      <strong>WillFlow 2.0 em ambiente real:</strong> explora dados verdadeiros e abre cards sem alterar registos nesta vista. Os atalhos levam aos módulos produtivos, onde as funções existentes continuam disponíveis. Uploads e migrações novos de vídeo permanecem desativados nesta experiência.
    </div>
    <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
      {([
        ['Captação', '/app/captacao'],
        ['Edição', '/app/edicao'],
        ['Financeiro', '/app/financeiro'],
        ['Calendário', '/app/calendario'],
        ['Chat', '/app/chat'],
        ['Equipa', '/app/equipa'],
      ] as const).map(([label, destination]) => (
        <Button key={destination} variant="outline" asChild className="justify-between">
          <Link to={destination}>{label}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {(['Projetos', 'Clientes', 'Vídeos', 'Pagamentos'] as ViewName[]).map(name =>
        <button key={name} onClick={() => { setTab(name); setSearch(''); setSelected(null); }}
          className="rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-violet-400 hover:shadow-md">
          <p className="text-sm text-muted-foreground">{name}</p>
          <p className="mt-2 text-3xl font-bold">{snapshot?.workspaceId === workspace?.id ? snapshot.counts[name] : '…'}</p>
          <p className="mt-1 text-xs text-muted-foreground">Registos do workspace · explorar →</p>
        </button>)}
    </div>
    <div className="flex flex-wrap gap-2">{views.map(name =>
      <Button key={name} size="sm" variant={tab === name ? 'default' : 'outline'}
        onClick={() => { setTab(name); setSelected(null); setSearch(''); }}>{name}</Button>)}</div>
    <Card><CardContent className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">{tab}</h2><p className="text-sm text-muted-foreground">Clica num card para abrir os detalhes.</p></div>
        <div className="relative w-full max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={event => setSearch(event.target.value)}
            placeholder="Pesquisar nesta área" className="pl-9" /></div>
      </div>
      {snapshot?.errors[tab] && <p role="alert" className="text-sm text-destructive">{snapshot.errors[tab]}</p>}
      {loading && <p className="text-sm text-muted-foreground">A consultar os dados do teu workspace…</p>}
      {!loading && filtered.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum registo disponível nesta área.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!loading && filtered.map(item => <button key={item.id} onClick={() => setSelected(item)}
          className="rounded-xl border p-4 text-left transition hover:border-violet-400 hover:bg-violet-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500">
          <div className="flex items-start justify-between gap-2"><strong className="line-clamp-2 text-sm">{item.title}</strong><ArrowRight className="h-4 w-4 shrink-0 text-violet-600" /></div>
          <p className="mt-2 truncate text-xs text-muted-foreground">{item.subtitle}</p>
          <div className="mt-4 flex items-center justify-between gap-2"><Badge variant="secondary">{item.status}</Badge>
            {item.value !== undefined && <span className="text-sm font-semibold">{currency(item.value)}</span>}</div>
        </button>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {snapshot?.workspaceId === workspace?.id ? snapshot.lists[tab].length : 0} de {snapshot?.counts[tab] ?? 0} registos carregados.
          {search ? ' A pesquisa filtra os registos já carregados.' : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          {tab !== 'Armazenamento' && snapshot && snapshot.lists[tab].length < snapshot.counts[tab] && (
            <Button type="button" variant="outline" disabled={loading || limits[tab] >= 2000}
              onClick={() => setLimits(previous => ({ ...previous, [tab]: Math.min(2000, previous[tab] + 100) }))}>
              Carregar mais 100
            </Button>
          )}
          <Button asChild variant="default" size="sm"><Link to={routes[tab]}>
            Trabalhar no módulo real <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </CardContent></Card>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
      <div role="dialog" aria-modal="true" aria-label="Detalhes do registo" onClick={event => event.stopPropagation()}
        className="w-full max-w-lg space-y-4 rounded-2xl border bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2"><div>
          <span className="text-xs font-semibold text-violet-600">{tab} · Somente leitura</span>
          <h3 className="mt-2 text-xl font-bold">{selected.title}</h3>
        </div><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setSelected(null)}><X className="h-5 w-5" /></Button></div>
        <div className="space-y-3 rounded-xl border p-4 text-sm">
          <p><strong>Descrição:</strong> {selected.subtitle}</p><p><strong>Estado:</strong> {selected.status}</p>
          <p><strong>Informação:</strong> {selected.detail}</p>
          {selected.value !== undefined && <p><strong>Valor:</strong> {currency(selected.value)}</p>}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Database className="h-4 w-4" />
          Dados reais do workspace, consultados sem operações de escrita.</p>
        <Button onClick={() => setSelected(null)} className="w-full">Fechar</Button>
      </div>
    </div>}
  </div>;
}
