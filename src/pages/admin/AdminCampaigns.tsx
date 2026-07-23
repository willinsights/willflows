import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Send, TestTube2, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface Recipient {
  id: string;
  email: string;
  full_name: string | null;
  last_login_at: string | null;
  subscription_status: string | null;
}

const DEFAULT_EXCLUDED = new Set(
  [
    'willdesign7@gmail.com',
    'moraisdanobrega@gmail.com',
    'chriscfcs@gmail.com',
    'telma.tempovip@gmail.com',
  ].map((e) => e.toLowerCase())
);

const DEFAULT_SUBJECT = '{nome}, o teu WillFlow está à tua espera';
const DEFAULT_BODY = `Olá {nome},

Reparámos que já não passas pelo WillFlow há algum tempo — e sentimos a tua falta.

Entre gravações, edições e clientes a pedir "então, quando fica pronto?", o sistema de gestão acaba muitas vezes por ficar de lado. Foi para resolver essa confusão de chats espalhados, folhas de Excel e projetos sem estado claro que construímos o WillFlow.

A boa notícia: a tua conta continua ativa e os teus dados intactos — Kanban, clientes, calendário e finanças, tudo onde deixaste. E enquanto estiveste fora melhorámos bastante a plataforma: novo Dashboard Financeiro (receita, margem e movimentos num só ecrã) e exportação de relatórios para Excel e PDF com um clique.

Entra e vê: https://willflow.app

Se algo não funcionou como esperavas, responde a este email — leio pessoalmente.

Um abraço,
Wilker — WillFlow`;

const ACTIVE_SUBJECT = '{nome}, a tua conta WillFlow espera-te';
const ACTIVE_BODY = `Olá {nome},

Há já algum tempo que não passas pelo WillFlow. A tua conta continua ativa e os teus dados intactos — Kanban, clientes, calendário e finanças, tudo onde deixaste.

Enquanto estiveste fora melhorámos bastante a plataforma: novo Dashboard Financeiro (receita, margem e movimentos num só ecrã) e exportação de relatórios para Excel e PDF com um clique.

Entra e vê: https://willflow.app

Se algo não funcionou como esperavas, responde a este email — leio pessoalmente.

Um abraço,
Wilker — WillFlow`;

type CampaignTemplate = {
  id: string;
  label: string;
  description: string;
  subject: string;
  body: string;
  subjectActive?: string;
  bodyActive?: string;
};

const NOVIDADES_SUBJECT = '{nome}, 3 novidades no WillFlow que te vão poupar horas';
const NOVIDADES_BODY = `Olá {nome},

Enquanto estiveste fora, o WillFlow cresceu. Três novidades que mudam o dia a dia:

- Dashboard Financeiro — receita, margem e movimentos de cada projeto num só ecrã. Sabes na hora se um trabalho foi rentável.
- Exportação para Excel e PDF — fecho de contas com um clique, pronto para o contabilista ou o cliente.
- Review Studio — o cliente comenta e aprova cada versão do vídeo no ponto exato, sem trocas de WeTransfer.

Tudo sobre o que já conheces: Kanban, CRM, chat e calendário Google.

Entra e vê: https://willflow.app

Um abraço,
Wilker — WillFlow`;

const WINBACK_SUBJECT = '{nome}, ficámos com pena de te ver partir';
const WINBACK_BODY = `Olá {nome},

Vi que cancelaste o WillFlow — e queria mesmo saber: o que faltou?

Se houve algo que não correspondeu às tuas expectativas, responde a este email. Leio pessoalmente e ajuda-nos a melhorar.

A tua conta e os teus dados continuam guardados — se quiseres voltar, está tudo onde deixaste. Entretanto melhorámos bastante o lado financeiro (dashboard de margens e exportação de relatórios) e a aprovação de vídeos com o cliente.

Quando quiseres voltar: https://willflow.app

Um abraço,
Wilker — WillFlow`;

const TEMPLATES: CampaignTemplate[] = [
  {
    id: 'reactivation',
    label: 'Reativação (dormentes)',
    description: 'Mensagem para utilizadores que não entram há algum tempo.',
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
    subjectActive: ACTIVE_SUBJECT,
    bodyActive: ACTIVE_BODY,
  },
  {
    id: 'novidades',
    label: 'Novidades',
    description: 'Anuncia as 3 melhorias recentes: Financeiro, Export, Review Studio.',
    subject: NOVIDADES_SUBJECT,
    body: NOVIDADES_BODY,
  },
  {
    id: 'winback',
    label: 'Win-back (cancelados)',
    description: 'Reconquista utilizadores que cancelaram. Sem descontos ou ofertas.',
    subject: WINBACK_SUBJECT,
    body: WINBACK_BODY,
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status: string | null) {
  if (status === 'active') return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">active</Badge>;
  if (status === 'trialing') return <Badge variant="secondary">trialing</Badge>;
  if (status === 'canceled') return <Badge variant="outline">canceled</Badge>;
  return <Badge variant="outline">{status || '—'}</Badge>;
}

export default function AdminCampaigns() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [subjectActive, setSubjectActive] = useState(ACTIVE_SUBJECT);
  const [bodyActive, setBodyActive] = useState(ACTIVE_BODY);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testEmail, setTestEmail] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('reactivation');

  function applyTemplate(id: string) {
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setTemplateId(id);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setSubjectActive(tpl.subjectActive ?? tpl.subject);
    setBodyActive(tpl.bodyActive ?? tpl.body);
    toast({ title: 'Template aplicado', description: tpl.label });
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setTestEmail(data.user?.email || 'geral@willflow.app');
    })();
  }, []);

  async function loadRecipients() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-campaign', {
        body: { action: 'preview' },
      });
      if (error) throw error;
      const list: Recipient[] = data?.recipients || [];
      setRecipients(list);
      // default selection: everyone except the 4 excluded
      const initial = new Set<string>();
      for (const r of list) {
        if (!DEFAULT_EXCLUDED.has(r.email.toLowerCase())) initial.add(r.id);
      }
      setSelected(initial);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e?.message ?? 'Falha desconhecida', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipients();
  }, []);

  const selectedList = useMemo(
    () => recipients.filter((r) => selected.has(r.id)),
    [recipients, selected]
  );
  const selectedActive = selectedList.filter((r) => r.subscription_status === 'active').length;
  const selectedOther = selectedList.length - selectedActive;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll(on: boolean) {
    if (on) setSelected(new Set(recipients.map((r) => r.id)));
    else setSelected(new Set());
  }

  async function handleSendTest() {
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Assunto e corpo são obrigatórios', variant: 'destructive' });
      return;
    }
    const target = testEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      toast({ title: 'Email de teste inválido', variant: 'destructive' });
      return;
    }
    setTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-campaign', {
        body: { action: 'send-test', subject, body, testEmail: target },
      });
      if (error) throw error;
      toast({ title: 'Teste enviado', description: `Enviado para ${data?.to || target}` });
    } catch (e: any) {
      toast({ title: 'Falha no teste', description: e?.message ?? 'Erro', variant: 'destructive' });
    } finally {
      setTestSending(false);
    }
  }

  async function handleSendCampaign() {
    setSending(true);
    setConfirmOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke('admin-campaign', {
        body: {
          action: 'send',
          subject,
          body,
          subjectActive,
          bodyActive,
          recipientIds: Array.from(selected),
        },
      });
      if (error) throw error;
      toast({
        title: 'Campanha enviada',
        description: `${data?.sent ?? 0} enviados · ${data?.failed ?? 0} falhas · ${data?.total ?? 0} total`,
      });
    } catch (e: any) {
      toast({ title: 'Falha no envio', description: e?.message ?? 'Erro', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold">Campanhas de Email</h1>
        <p className="text-muted-foreground">
          Reativação de utilizadores dormentes. Envio 100% manual — nada é disparado automaticamente.
        </p>
      </motion.div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Reutiliza a infraestrutura de email transacional (edge function <code>send-transactional-email</code>,
          domínio <code>willflow.app</code>). O envio respeita a lista de supressão, preferências de marketing e
          contas internas/bloqueadas. Cada email inclui link de unsubscribe.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Segmento: Dormentes (30–180 dias)
          </CardTitle>
          <CardDescription>
            Últimos logins entre 30 e 180 dias. Excluídos automaticamente: supressões, marketing desativado,
            contas internas/bloqueadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar destinatários…
            </div>
          ) : recipients.length === 0 ? (
            <p className="text-muted-foreground py-6">Nenhum destinatário elegível.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground tabular-nums">{selected.size}</strong> de{' '}
                  <span className="tabular-nums">{recipients.length}</span> selecionados
                  {selectedActive > 0 && (
                    <span className="ml-2">
                      · {selectedActive} active · {selectedOther} outros
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>
                    Selecionar todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Último login</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{r.full_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.email}</TableCell>
                        <TableCell className="text-sm tabular-nums">{formatDate(r.last_login_at)}</TableCell>
                        <TableCell>{statusBadge(r.subscription_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editor da campanha</CardTitle>
          <CardDescription>
            Usa <code>{'{nome}'}</code> para o primeiro nome do destinatário. O link de unsubscribe é adicionado
            automaticamente no rodapé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="default">
            <TabsList>
              <TabsTrigger value="default">Padrão (trialing / canceled)</TabsTrigger>
              <TabsTrigger value="active">Clientes ativos</TabsTrigger>
            </TabsList>

            <TabsContent value="default" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="body">Corpo</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={16}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="active" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Usado apenas para destinatários com subscription_status = <code>active</code>. Sem linguagem de
                "teste grátis".
              </p>
              <div>
                <Label htmlFor="subjectA">Assunto (active)</Label>
                <Input id="subjectA" value={subjectActive} onChange={(e) => setSubjectActive(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bodyA">Corpo (active)</Label>
                <Textarea
                  id="bodyA"
                  value={bodyActive}
                  onChange={(e) => setBodyActive(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-3 justify-end sticky bottom-4 bg-background/80 backdrop-blur border rounded-lg p-3">
        <div className="flex-1 min-w-[220px] max-w-sm">
          <Label htmlFor="testEmail" className="text-xs text-muted-foreground">Email de teste</Label>
          <Input
            id="testEmail"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="destinatario@exemplo.com"
          />
        </div>
        <Button variant="outline" onClick={handleSendTest} disabled={testSending || sending}>
          {testSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube2 className="h-4 w-4 mr-2" />}
          Enviar teste
        </Button>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={sending || selected.size === 0 || loading}
        >
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Enviar campanha ({selected.size})
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio da campanha</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Vais enviar esta campanha para <strong>{selected.size} destinatários</strong>.
                </p>
                <p className="text-sm">
                  {selectedActive} recebem a versão para clientes ativos · {selectedOther} recebem a versão
                  padrão.
                </p>
                <p className="text-sm text-muted-foreground">
                  Filtros de segurança finais (supressão, marketing off, internos/bloqueados) são reaplicados
                  no servidor antes do envio.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendCampaign}>Confirmar envio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
