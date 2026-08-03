import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Printer,
  Upload,
  Film,
  Building2,
  CalendarDays,
  Euro,
  Plane,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useActivityReportData } from '@/hooks/useActivityReport';
import {
  SAMPLE_PROJETOS,
  SAMPLE_GRAVACOES,
  SAMPLE_DIARIAS,
  SAMPLE_TRABALHOS,
} from '@/lib/report/sampleData';
import '@/styles/activity-report.css';

const PALETTE = {
  ink: '#12233b',
  blue: '#124a6b',
  teal: '#0e7c86',
  amber: '#e8a13a',
  line: '#e6ebf1',
};

const ALL = '__all__';
const MESES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MES_LABEL: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function monthOf(p: { mes: string | null; data_entrega: string | null }) {
  if (p.mes && MESES.includes(p.mes.padStart(2, '0'))) return p.mes.padStart(2, '0');
  if (p.data_entrega) return p.data_entrega.slice(5, 7);
  return null;
}

export default function RelatorioAtividade() {
  const data = useActivityReportData();
  const isEmpty = !data.isLoading && data.projetos.length === 0;
  const { refetchAll, isRefetching } = data;

  const projetos = isEmpty ? SAMPLE_PROJETOS : data.projetos;
  const gravacoes = isEmpty ? SAMPLE_GRAVACOES : data.gravacoes;
  const diarias = isEmpty ? SAMPLE_DIARIAS : data.diarias;
  const trabalhos = isEmpty ? SAMPLE_TRABALHOS : data.trabalhos;

  const anos = useMemo(() => {
    const set = new Set<number>();
    projetos.forEach((p) => p.ano && set.add(p.ano));
    gravacoes.forEach((g) => g.ano && set.add(g.ano));
    if (!set.size) set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [projetos, gravacoes]);

  const [ano, setAno] = useState<number>(anos[0]);
  const [cliente, setCliente] = useState<string>(ALL);
  const [colaborador, setColaborador] = useState<string>(ALL);
  const [mes, setMes] = useState<string>(ALL);
  const [moeda, setMoeda] = useState<'EUR' | 'BRL'>('EUR');

  const anoAtivo = anos.includes(ano) ? ano : anos[0];

  const taxa = useMemo(() => {
    if (moeda === 'EUR') return 1;
    const c = data.cambio.find((x) => x.de === 'EUR' && x.para === 'BRL');
    const inv = data.cambio.find((x) => x.de === 'BRL' && x.para === 'EUR');
    if (c) return Number(c.taxa) || 1;
    if (inv && Number(inv.taxa)) return 1 / Number(inv.taxa);
    return 6.2;
  }, [moeda, data.cambio]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: moeda,
      maximumFractionDigits: 0,
    }).format(v * taxa);

  const clientes = useMemo(
    () => [...new Set(projetos.map((p) => p.cliente).filter(Boolean) as string[])].sort(),
    [projetos],
  );
  const colaboradores = useMemo(() => {
    const set = new Set<string>();
    projetos.forEach((p) => {
      if (p.edicao) set.add(p.edicao);
      if (p.captacao) set.add(p.captacao);
    });
    return [...set].sort();
  }, [projetos]);

  const filtered = useMemo(
    () =>
      projetos.filter((p) => {
        if ((p.ano ?? anoAtivo) !== anoAtivo) return false;
        if (cliente !== ALL && p.cliente !== cliente) return false;
        if (colaborador !== ALL && p.edicao !== colaborador && p.captacao !== colaborador) return false;
        if (mes !== ALL && monthOf(p) !== mes) return false;
        return true;
      }),
    [projetos, anoAtivo, cliente, colaborador, mes],
  );

  const gravacoesFiltradas = useMemo(
    () =>
      gravacoes.filter((g) => {
        if ((g.ano ?? anoAtivo) !== anoAtivo) return false;
        if (cliente !== ALL && g.cliente !== cliente) return false;
        if (mes !== ALL && g.data?.slice(5, 7) !== mes) return false;
        if (colaborador !== ALL && !(g.colaboradores ?? []).includes(colaborador)) return false;
        return true;
      }),
    [gravacoes, anoAtivo, cliente, mes, colaborador],
  );

  const kpis = useMemo(() => {
    const receita = filtered.reduce((s, p) => s + Number(p.receita || 0), 0);
    return {
      videos: filtered.length,
      empresas: new Set(filtered.map((p) => p.cliente).filter(Boolean)).size,
      dias: gravacoesFiltradas.length,
      receita,
      lucro: filtered.reduce((s, p) => s + Number(p.lucro || 0), 0),
    };
  }, [filtered, gravacoesFiltradas]);

  const porCliente = useMemo(() => {
    const map = new Map<string, { cliente: string; videos: number; versoes: number; valor: number }>();
    filtered.forEach((p) => {
      const key = p.cliente || 'Sem cliente';
      const cur = map.get(key) ?? { cliente: key, videos: 0, versoes: 0, valor: 0 };
      cur.videos += 1;
      cur.versoes += Number(p.versoes || 1);
      cur.valor += Number(p.receita || 0);
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.videos - a.videos);
  }, [filtered]);

  const porMes = useMemo(
    () =>
      MESES.map((m) => {
        const rows = filtered.filter((p) => monthOf(p) === m);
        const receita = rows.reduce((s, p) => s + Number(p.receita || 0), 0);
        const custo = rows.reduce((s, p) => s + Number(p.custo || 0), 0);
        return {
          mes: MES_LABEL[m],
          receita: Math.round(receita * taxa),
          custo: Math.round(custo * taxa),
          lucro: Math.round((receita - custo) * taxa),
          videos: rows.length,
        };
      }),
    [filtered, taxa],
  );

  const porEditor = useMemo(() => {
    const map = new Map<string, { editor: string; videos: number; custo: number }>();
    filtered.forEach((p) => {
      const key = p.edicao || 'Sem editor';
      const cur = map.get(key) ?? { editor: key, videos: 0, custo: 0 };
      cur.videos += 1;
      cur.custo += Number(p.custo_colab || 0);
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.videos - a.videos);
  }, [filtered]);

  const grandesProducoes = porCliente.slice(0, 3);

  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${PALETTE.line}`,
    fontSize: 12,
  };

  return (
    <div className="report-root min-h-screen -m-4 sm:-m-6 p-4 sm:p-6">
      {/* Header */}
      <header className="rp-card rp-header p-5 mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: PALETTE.ink }}>
              Relatório de Atividade {anoAtivo}
            </h1>
            <p className="text-sm mt-1" style={{ color: PALETTE.blue }}>
              In-Sights · Wilker Oliveira → {cliente === ALL ? 'Todos os clientes' : cliente}
            </p>
            <span className="rp-badge mt-2">
              <Sparkles className="h-3 w-3" />
              Atualizado em {new Date().toLocaleDateString('pt-PT')}
              {isEmpty && ' · dados de exemplo'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 rp-no-print">
            <Select value={String(anoAtivo)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="h-9 w-[110px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={cliente} onValueChange={setCliente}>
              <SelectTrigger className="h-9 w-[170px] bg-white"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os clientes</SelectItem>
                {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={colaborador} onValueChange={setColaborador}>
              <SelectTrigger className="h-9 w-[160px] bg-white"><SelectValue placeholder="Colaborador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os colaboradores</SelectItem>
                {colaboradores.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-9 w-[120px] bg-white"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os meses</SelectItem>
                {MESES.map((m) => <SelectItem key={m} value={m}>{MES_LABEL[m]}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={moeda} onValueChange={(v) => setMoeda(v as 'EUR' | 'BRL')}>
              <SelectTrigger className="h-9 w-[90px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="BRL">BRL</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-9 bg-white"
              onClick={() => refetchAll()}
              disabled={isRefetching}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1.5', isRefetching && 'animate-spin')} />
              Recarregar dados
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 bg-white">
              <Link to="/app/relatorio-atividade/importar">
                <Upload className="h-4 w-4 mr-1.5" /> Importar
              </Link>
            </Button>
            <Button
              size="sm"
              className="h-9 text-white"
              style={{ backgroundColor: PALETTE.teal }}
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-1.5" /> Exportar PDF
            </Button>
          </div>
        </div>
      </header>

      {isEmpty && (
        <div className="rp-card p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="font-semibold">Ainda não importaste dados do WillFlow</p>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Estás a ver dados de exemplo para pré-visualizar o layout. Importa CSV, XLSX ou cola JSON.
            </p>
          </div>
          <Button asChild className="text-white rp-no-print" style={{ backgroundColor: PALETTE.blue }}>
            <Link to="/app/relatorio-atividade/importar">Importar dados</Link>
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Kpi icon={Film} label="Vídeos entregues" value={String(kpis.videos)} tone={PALETTE.blue} />
        <Kpi icon={Building2} label="Empresas / projetos" value={String(kpis.empresas)} tone={PALETTE.teal} />
        <Kpi icon={CalendarDays} label="Dias de gravação" value={String(kpis.dias)} tone={PALETTE.amber} />
        <Kpi
          icon={Euro}
          label="Total faturado"
          value={fmt(kpis.receita)}
          hint={`+ IVA · lucro ${fmt(kpis.lucro)}`}
          tone={PALETTE.ink}
        />
      </div>

      {/* Vídeos por empresa */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <div className="rp-card p-5 xl:col-span-2">
          <SectionTitle>Vídeos por empresa / projeto</SectionTitle>
          <div style={{ height: Math.max(220, porCliente.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porCliente} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} stroke={PALETTE.line} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <YAxis type="category" dataKey="cliente" width={130} tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="videos" name="Vídeos" fill={PALETTE.teal} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rp-card p-5">
          <SectionTitle>Detalhe por cliente</SectionTitle>
          <div className="max-h-[300px] overflow-auto">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="rp-num">Vídeos</th>
                  <th className="rp-num">Versões</th>
                  <th className="rp-num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {porCliente.map((c) => (
                  <tr key={c.cliente}>
                    <td className="font-medium">{c.cliente}</td>
                    <td className="rp-num">{c.videos}</td>
                    <td className="rp-num">{c.versoes}</td>
                    <td className="rp-num">{fmt(c.valor)}</td>
                  </tr>
                ))}
                {!porCliente.length && (
                  <tr><td colSpan={4} className="text-center py-6 text-sm text-slate-500">Sem dados no período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Grandes produções */}
      <section className="mb-4">
        <div className="rp-card p-5">
          <SectionTitle>Grandes produções (viagem)</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            {grandesProducoes.map((p, i) => (
              <div
                key={p.cliente}
                className="rounded-xl p-4"
                style={{
                  border: `1px solid ${PALETTE.line}`,
                  background: i === 0 ? 'rgba(14,124,134,0.06)' : '#fff',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="h-4 w-4" style={{ color: PALETTE.amber }} />
                  <span className="font-semibold">{p.cliente}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Mini label="Vídeos" value={String(p.videos)} />
                  <Mini label="Versões" value={String(p.versoes)} />
                  <Mini label="Valor" value={fmt(p.valor)} />
                </div>
              </div>
            ))}
            {!grandesProducoes.length && (
              <p className="text-sm text-slate-500">Sem produções no período selecionado.</p>
            )}
          </div>
        </div>
      </section>

      {/* Valores por mês + produção por editor */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="rp-card p-5">
          <SectionTitle>Valores por mês</SectionTitle>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={porMes} margin={{ left: 0, right: 12 }}>
                <CartesianGrid stroke={PALETTE.line} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={54} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="receita" name="Receita" stroke={PALETTE.blue} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="custo" name="Custo" stroke={PALETTE.amber} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lucro" name="Lucro" stroke={PALETTE.teal} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rp-card p-5">
          <SectionTitle>Produção por editor</SectionTitle>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porEditor} margin={{ left: 0, right: 12 }}>
                <CartesianGrid stroke={PALETTE.line} vertical={false} />
                <XAxis dataKey="editor" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={44} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="videos" name="Vídeos editados" fill={PALETTE.blue} radius={[6, 6, 0, 0]} />
                <Bar dataKey="custo" name="Custo colaborador" fill={PALETTE.amber} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Rodapé: 3 cartões */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 rp-page-break">
        <div className="rp-card p-5">
          <SectionTitle>Dias de gravação</SectionTitle>
          <div className="max-h-[280px] overflow-auto">
            <table className="rp-table">
              <thead>
                <tr><th>Data</th><th>Local</th><th>Cliente</th><th>Produções</th></tr>
              </thead>
              <tbody>
                {gravacoesFiltradas.map((g) => (
                  <tr key={g.id}>
                    <td className="whitespace-nowrap">{new Date(g.data).toLocaleDateString('pt-PT')}</td>
                    <td>{g.local}</td>
                    <td>{g.cliente}</td>
                    <td className="text-slate-500">{(g.producoes ?? []).join(', ')}</td>
                  </tr>
                ))}
                {!gravacoesFiltradas.length && (
                  <tr><td colSpan={4} className="text-center py-6 text-sm text-slate-500">Sem gravações</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rp-card p-5">
          <SectionTitle>Diárias em estúdio & complementares</SectionTitle>
          <table className="rp-table">
            <thead><tr><th>Data</th><th>Colaborador / descrição</th><th>Tipo</th><th className="rp-num">Valor</th></tr></thead>
            <tbody>
              {diarias
                .filter((d) => (d.ano ?? anoAtivo) === anoAtivo)
                .map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap">{new Date(d.data).toLocaleDateString('pt-PT')}</td>
                    <td>
                      <span className="font-medium">{d.colaborador}</span>
                      {d.notas && <span className="text-slate-500"> · {d.notas}</span>}
                    </td>
                    <td>{d.tipo === 'fixo' ? 'Mensal fixo' : 'Diária'}</td>
                    <td className="rp-num">{fmt(Number(d.valor || 0))}</td>
                  </tr>
                ))}
              {trabalhos
                .filter((t) => (t.ano ?? anoAtivo) === anoAtivo)
                .map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap">{new Date(t.data).toLocaleDateString('pt-PT')}</td>
                    <td>{t.descricao}{t.cliente ? ` · ${t.cliente}` : ''}</td>
                    <td>Complementar</td>
                    <td className="rp-num">{fmt(Number(t.valor || 0))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="rp-card p-5">
          <SectionTitle>Valores — resumo mensal</SectionTitle>
          <table className="rp-table">
            <thead><tr><th>Mês</th><th>Destaque</th><th className="rp-num">Valor</th></tr></thead>
            <tbody>
              {porMes.filter((m) => m.videos > 0).map((m) => {
                const rows = filtered.filter((p) => MES_LABEL[monthOf(p) ?? ''] === m.mes);
                const top = [...new Set(rows.map((r) => r.cliente).filter(Boolean))].slice(0, 2).join(', ');
                return (
                  <tr key={m.mes}>
                    <td className="font-medium">{m.mes}</td>
                    <td className="text-slate-500">{top || '—'} · {m.videos} vídeos</td>
                    <td className="rp-num">{fmt(m.receita / taxa)}</td>
                  </tr>
                );
              })}
              {!porMes.some((m) => m.videos > 0) && (
                <tr><td colSpan={3} className="text-center py-6 text-sm text-slate-500">Sem valores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold mb-3" style={{ color: PALETTE.ink }}>{children}</h2>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="rp-label">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className="rp-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="rp-label">{label}</div>
          <div className="rp-kpi-value mt-1 truncate">{value}</div>
          {hint && <div className="text-xs mt-1 text-slate-500">{hint}</div>}
        </div>
        <div className="rounded-xl p-2 shrink-0" style={{ background: `${tone}14` }}>
          <Icon className="h-5 w-5" style={{ color: tone }} />
        </div>
      </div>
    </div>
  );
}
