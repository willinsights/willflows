import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Play, Check, Eye } from "lucide-react";
import { format } from "date-fns";

interface WebhookInboxRow {
  id: string;
  provider: string;
  event_id: string;
  event_type: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
  payload: unknown;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  processing: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  processed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  dead: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export default function AdminWebhooks() {
  const { toast } = useToast();
  const [rows, setRows] = useState<WebhookInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<WebhookInboxRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("webhook_inbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (provider !== "all") q = q.eq("provider", provider);
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Erro a carregar inbox", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as WebhookInboxRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, status]);

  const triggerWorker = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("webhook-retry-worker", { body: {} });
    if (error) {
      toast({ title: "Worker falhou", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Worker executado", description: "A recarregar lista..." });
      await load();
    }
    setLoading(false);
  };

  const retryNow = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("webhook_inbox_retry_now", { p_id: id });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reagendado", description: "Evento marcado para reprocessamento" });
      await load();
    }
    setBusyId(null);
  };

  const resolve = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("webhook_inbox_resolve", { p_id: id });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resolvido", description: "Evento marcado como processado" });
      await load();
    }
    setBusyId(null);
  };

  const stats = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    failed: rows.filter((r) => r.status === "failed").length,
    dead: rows.filter((r) => r.status === "dead").length,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks Inbox</h1>
          <p className="text-muted-foreground">Eventos externos (Stripe, Google, …) com retentativas automáticas</p>
        </div>
        <Button onClick={triggerWorker} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Correr worker agora
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total (200 últimos)", value: stats.total },
          { label: "Pendentes", value: stats.pending },
          { label: "Falhados", value: stats.failed },
          { label: "Dead-letter", value: stats.dead },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Eventos</CardTitle>
          <div className="flex gap-2">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os providers</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="processing">Em processamento</SelectItem>
                <SelectItem value="failed">Falhados</SelectItem>
                <SelectItem value="dead">Dead-letter</SelectItem>
                <SelectItem value="processed">Processados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Event ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Próxima</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Sem eventos
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.provider}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.event_id.substring(0, 24)}…</TableCell>
                  <TableCell className="text-xs">{r.event_type ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>{r.attempts}/{r.max_attempts}</TableCell>
                  <TableCell className="text-xs">{format(new Date(r.next_retry_at), "dd/MM HH:mm")}</TableCell>
                  <TableCell className="text-xs">{format(new Date(r.created_at), "dd/MM HH:mm")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => setSelected(r)} title="Ver detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(r.status === "failed" || r.status === "dead" || r.status === "pending") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={busyId === r.id}
                        onClick={() => retryNow(r.id)}
                        title="Reprocessar agora"
                      >
                        {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    )}
                    {r.status !== "processed" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={busyId === r.id}
                        onClick={() => resolve(r.id)}
                        title="Marcar como resolvido"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected?.provider} · {selected?.event_id}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.last_error && (
                <div>
                  <div className="text-sm font-semibold mb-1">Último erro</div>
                  <pre className="text-xs bg-destructive/10 text-destructive p-3 rounded whitespace-pre-wrap">
                    {selected.last_error}
                  </pre>
                </div>
              )}
              <div>
                <div className="text-sm font-semibold mb-1">Payload</div>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-[400px]">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
