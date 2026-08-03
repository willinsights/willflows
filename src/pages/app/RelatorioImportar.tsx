import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, ClipboardPaste, Trash2, Link2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivityReportMutations } from '@/hooks/useActivityReport';
import { useAppToast } from '@/hooks/useAppToast';

type TableKey = 'projetos' | 'gravacoes' | 'estudio_diarias' | 'trabalhos_complementares' | 'cambio';

const NONE = '__none__';

const SCHEMAS: Record<TableKey, { label: string; fields: { key: string; label: string; type: 'text' | 'number' | 'date' | 'list' }[] }> = {
  projetos: {
    label: 'Projetos (vídeos/entregas)',
    fields: [
      { key: 'codigo', label: 'Código', type: 'text' },
      { key: 'projeto', label: 'Projeto', type: 'text' },
      { key: 'cliente', label: 'Cliente', type: 'text' },
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'data_entrega', label: 'Data de Entrega', type: 'date' },
      { key: 'captacao', label: 'Captação', type: 'text' },
      { key: 'edicao', label: 'Edição', type: 'text' },
      { key: 'versoes', label: 'Versões', type: 'number' },
      { key: 'receita', label: 'Receita', type: 'number' },
      { key: 'custo_colab', label: 'Custo Colab.', type: 'number' },
      { key: 'extras', label: 'Extras', type: 'number' },
      { key: 'custo', label: 'Custo', type: 'number' },
      { key: 'lucro', label: 'Lucro', type: 'number' },
      { key: 'status', label: 'Status', type: 'text' },
    ],
  },
  gravacoes: {
    label: 'Dias de gravação',
    fields: [
      { key: 'data', label: 'Data', type: 'date' },
      { key: 'local', label: 'Local', type: 'text' },
      { key: 'cliente', label: 'Cliente', type: 'text' },
      { key: 'ponto_encontro', label: 'Ponto de encontro', type: 'text' },
      { key: 'producoes', label: 'Produções (separadas por ;)', type: 'list' },
      { key: 'colaboradores', label: 'Colaboradores (separados por ;)', type: 'list' },
    ],
  },
  estudio_diarias: {
    label: 'Diárias em estúdio',
    fields: [
      { key: 'data', label: 'Data', type: 'date' },
      { key: 'colaborador', label: 'Colaborador', type: 'text' },
      { key: 'tipo', label: 'Tipo (fixo/diaria)', type: 'text' },
      { key: 'valor', label: 'Valor', type: 'number' },
      { key: 'notas', label: 'Notas', type: 'text' },
    ],
  },
  trabalhos_complementares: {
    label: 'Trabalhos complementares',
    fields: [
      { key: 'data', label: 'Data', type: 'date' },
      { key: 'descricao', label: 'Descrição', type: 'text' },
      { key: 'cliente', label: 'Cliente', type: 'text' },
      { key: 'valor', label: 'Valor', type: 'number' },
    ],
  },
  cambio: {
    label: 'Taxas de câmbio',
    fields: [
      { key: 'de', label: 'De (ex. BRL)', type: 'text' },
      { key: 'para', label: 'Para (ex. EUR)', type: 'text' },
      { key: 'taxa', label: 'Taxa', type: 'number' },
    ],
  },
};

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const delimiter = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); lines.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); lines.push(row); }
  const nonEmpty = lines.filter((r) => r.some((c) => c.trim() !== ''));
  return { headers: (nonEmpty[0] ?? []).map((h) => h.trim()), rows: nonEmpty.slice(1) };
}

export default function RelatorioImportar() {
  const toast = useAppToast();
  const { importRows, clearTable } = useActivityReportMutations();

  const [table, setTable] = useState<TableKey>('projetos');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [json, setJson] = useState('');
  const [parsing, setParsing] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('willflow_sync_url') ?? '');
  const [apiToken, setApiToken] = useState('');

  const schema = SCHEMAS[table];

  const autoMap = (hs: string[]) => {
    const map: Record<string, string> = {};
    schema.fields.forEach((f) => {
      const match = hs.find((h) => normalize(h) === normalize(f.key) || normalize(h) === normalize(f.label.split(' (')[0]));
      if (match) map[f.key] = match;
    });
    setMapping(map);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      if (file.name.endsWith('.numbers')) {
        toast.error('Ficheiros .numbers não podem ser lidos diretamente — exporta para CSV ou XLSX no Numbers.');
        return;
      }
      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        const { headers: hs, rows: rs } = parseCsv(await file.text());
        setHeaders(hs); setRows(rs); autoMap(hs);
      } else {
        const ExcelJS = await import('exceljs');
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        const hs: string[] = [];
        const rs: unknown[][] = [];
        ws.eachRow((row, idx) => {
          const values = (row.values as unknown[]).slice(1).map((v) => {
            if (v && typeof v === 'object' && 'text' in (v as Record<string, unknown>)) return (v as { text: string }).text;
            if (v && typeof v === 'object' && 'result' in (v as Record<string, unknown>)) return (v as { result: unknown }).result;
            return v;
          });
          if (idx === 1) hs.push(...values.map((v) => String(v ?? '').trim()));
          else rs.push(values);
        });
        setHeaders(hs); setRows(rs); autoMap(hs);
      }
      toast.success('Ficheiro lido. Confirma o mapeamento das colunas.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível ler o ficheiro');
    } finally {
      setParsing(false);
    }
  };

  const mappedRows = useMemo(() => {
    if (!headers.length) return [];
    return rows.map((r) => {
      const out: Record<string, unknown> = {};
      schema.fields.forEach((f) => {
        const col = mapping[f.key];
        if (!col || col === NONE) return;
        const raw = r[headers.indexOf(col)];
        if (raw === undefined || raw === null || raw === '') return;
        if (f.type === 'number') out[f.key] = toNumber(raw);
        else if (f.type === 'date') out[f.key] = toDate(raw);
        else if (f.type === 'list') out[f.key] = String(raw).split(/[;|]/).map((s) => s.trim()).filter(Boolean);
        else out[f.key] = String(raw).trim();
      });
      return withDerived(table, out);
    }).filter((r) => Object.keys(r).length > 1);
  }, [rows, headers, mapping, schema, table]);

  const doImport = async (payload: Record<string, unknown>[]) => {
    if (!payload.length) { toast.error('Nada para importar'); return; }
    try {
      await importRows.mutateAsync({ table, rows: payload });
      toast.success(`${payload.length} registos importados para "${schema.label}"`);
      setRows([]); setHeaders([]); setJson('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao importar');
    }
  };

  const importJson = async () => {
    try {
      const parsed = JSON.parse(json);
      const arr: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed];
      const allowed = new Set(schema.fields.map((f) => f.key));
      const clean = arr.map((o) => {
        const out: Record<string, unknown> = {};
        Object.entries(o).forEach(([k, v]) => {
          const field = schema.fields.find((f) => f.key === k || normalize(f.label) === normalize(k));
          if (!field || !allowed.has(field.key)) return;
          if (field.type === 'number') out[field.key] = toNumber(v);
          else if (field.type === 'date') out[field.key] = toDate(v);
          else if (field.type === 'list') out[field.key] = Array.isArray(v) ? v.map(String) : String(v).split(/[;|,]/).map((s) => s.trim()).filter(Boolean);
          else out[field.key] = String(v);
        });
        return withDerived(table, out);
      });
      await doImport(clean);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'JSON inválido');
    }
  };

  return (
    <div>
      <PageHeader
        title="Importar dados do relatório"
        description="Carrega exportações do WillFlow (CSV/XLSX), cola JSON ou configura sincronização por API."
        actions={
          <Button asChild variant="outline">
            <Link to="/app/relatorio-atividade"><ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar ao relatório</Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Destino</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={table} onValueChange={(v) => { setTable(v as TableKey); setMapping({}); }}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(SCHEMAS) as TableKey[]).map((k) => (
                <SelectItem key={k} value={k}>{SCHEMAS[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => clearTable.mutate(table)}
            disabled={clearTable.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Limpar tabela
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="ficheiro">
        <TabsList>
          <TabsTrigger value="ficheiro">Ficheiro</TabsTrigger>
          <TabsTrigger value="json">Colar JSON</TabsTrigger>
          <TabsTrigger value="api">Sincronizar por API</TabsTrigger>
        </TabsList>

        <TabsContent value="ficheiro" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Carregar ficheiro (CSV, XLSX)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="file"
                accept=".csv,.xlsx,.numbers"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <p className="text-xs text-muted-foreground">
                Ficheiros .numbers: exporta primeiro para CSV ou XLSX na app Numbers.
              </p>
              {parsing && <p className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> A ler ficheiro…</p>}
            </CardContent>
          </Card>

          {headers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Mapear colunas · {rows.length} linhas detetadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schema.fields.map((f) => (
                    <div key={f.key}>
                      <Label className="text-xs">{f.label}</Label>
                      <Select
                        value={mapping[f.key] ?? NONE}
                        onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— ignorar —</SelectItem>
                          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {schema.fields.map((f) => <th key={f.key} className="text-left p-2 font-medium">{f.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {mappedRows.slice(0, 8).map((r, i) => (
                        <tr key={i} className="border-t">
                          {schema.fields.map((f) => (
                            <td key={f.key} className="p-2 whitespace-nowrap">
                              {Array.isArray(r[f.key]) ? (r[f.key] as string[]).join(', ') : String(r[f.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button onClick={() => doImport(mappedRows)} disabled={importRows.isPending || !mappedRows.length}>
                  {importRows.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Importar {mappedRows.length} registos
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="json" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4" /> Colar JSON
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={10}
                className="font-mono text-xs"
                placeholder={`[{"codigo":"IS-001","projeto":"Reel Hotel","cliente":"Tempovip","receita":480}]`}
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
              <Button onClick={importJson} disabled={importRows.isPending || !json.trim()}>
                {importRows.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Importar JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Sincronização automática
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-w-xl">
              <div>
                <Label className="text-xs">URL do endpoint</Label>
                <Input className="mt-1" placeholder="https://…/export" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Token</Label>
                <Input className="mt-1" type="password" placeholder="Bearer token" value={apiToken} onChange={(e) => setApiToken(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { localStorage.setItem('willflow_sync_url', apiUrl); toast.success('URL guardado'); }}>
                  Guardar configuração
                </Button>
                <Button
                  disabled={!apiUrl || importRows.isPending}
                  onClick={async () => {
                    try {
                      const res = await fetch(apiUrl, {
                        headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
                      });
                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                      setJson(JSON.stringify(await res.json(), null, 2));
                      toast.success('Dados obtidos — revê no separador "Colar JSON" e importa.');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Falha na sincronização');
                    }
                  }}
                >
                  Sincronizar agora
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O token não é guardado no navegador — é usado apenas neste pedido.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function withDerived(table: TableKey, row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  const dateField = table === 'projetos' ? 'data_entrega' : 'data';
  const d = out[dateField] as string | undefined;
  if (d && table !== 'cambio') {
    out.ano = Number(d.slice(0, 4));
    if (table === 'projetos') out.mes = d.slice(5, 7);
  }
  if (table === 'projetos') {
    if (out.custo === undefined) out.custo = Number(out.custo_colab ?? 0) + Number(out.extras ?? 0);
    if (out.lucro === undefined) out.lucro = Number(out.receita ?? 0) - Number(out.custo ?? 0);
    if (!out.projeto) out.projeto = String(out.codigo ?? 'Sem título');
  }
  return out;
}
