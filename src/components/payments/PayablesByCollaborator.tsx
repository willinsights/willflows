import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ChevronDown, ChevronRight, CheckCircle2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PrivacyBlur } from '@/components/ui/PrivacyBlur';
import { useToast } from '@/hooks/use-toast';
import type { ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';

interface ProjectLite {
  id: string;
  name: string;
  project_code: string | null;
  delivered_at: string | null;
  is_delivered: boolean | null;
}

interface Props {
  teamPayments: ProjectTeamPayment[];
  projects: ProjectLite[];
  members: { user_id: string; full_name: string | null }[];
  onStatusChange: (teamId: string, status: string) => Promise<unknown>;
  formatCurrency: (v: number) => string;
}

interface Row {
  id: string;
  amount: number;
  projectLabel: string;
  monthKey: string;
  deliveredAt: string;
}

/**
 * "A pagar" agrupado por colaborador: valores de trabalhos entregues ainda não pagos.
 * Cada valor pertence ao mês da entrega (competência), mesmo que seja pago depois.
 */
export function PayablesByCollaborator({ teamPayments, projects, members, onStatusChange, formatCurrency }: Props) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);

  const groups = useMemo(() => {
    const projById = new Map(projects.map(p => [p.id, p]));
    const map = new Map<string, { key: string; name: string; total: number; rows: Row[] }>();
    for (const tp of teamPayments) {
      const proj = projById.get(tp.project_id);
      if (!proj?.is_delivered || !proj.delivered_at) continue;
      if (tp.payment_status === 'pago' || tp.payment_status === 'cancelado') continue;
      const amount = Number(tp.payment_amount || 0);
      if (amount <= 0) continue;
      const key = tp.user_id || (tp as any).external_name || 'sem-nome';
      const name = tp.user_id
        ? members.find(m => m.user_id === tp.user_id)?.full_name || 'Colaborador'
        : (tp as any).external_name || 'Externo';
      const g = map.get(key) || { key, name, total: 0, rows: [] };
      g.total += amount;
      g.rows.push({
        id: tp.id,
        amount,
        projectLabel: `${proj.project_code || proj.id.slice(0, 8).toUpperCase()} · ${proj.name}`,
        monthKey: proj.delivered_at.slice(0, 7),
        deliveredAt: proj.delivered_at,
      });
      map.set(key, g);
    }
    const list = Array.from(map.values());
    list.forEach(g => g.rows.sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt)));
    return list.sort((a, b) => b.total - a.total);
  }, [teamPayments, projects, members]);

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const selectedTotal = groups.flatMap(g => g.rows).filter(r => selected.has(r.id)).reduce((s, r) => s + r.amount, 0);

  const toggle = (ids: string[], on: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const paySelected = async () => {
    if (selected.size === 0) return;
    setPaying(true);
    const ids = Array.from(selected);
    let failed = 0;
    for (const id of ids) {
      try { await onStatusChange(id, 'pago'); } catch { failed++; }
    }
    setPaying(false);
    setSelected(new Set());
    toast({
      title: failed ? 'Alguns pagamentos falharam' : 'Pagamentos registados',
      description: failed
        ? `${ids.length - failed} marcados como pagos, ${failed} com erro.`
        : `${ids.length} valores marcados como pagos.`,
      variant: failed ? 'destructive' : 'default',
    });
  };

  const monthLabel = (k: string) => format(new Date(`${k}-01T00:00:00`), 'MMMM yyyy', { locale: pt });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-primary" /> A pagar por colaborador
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Trabalhos entregues ainda por pagar. Cada valor conta no mês da entrega.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Total: <PrivacyBlur><strong className="text-foreground">{formatCurrency(grandTotal)}</strong></PrivacyBlur>
          </span>
          <Button size="sm" disabled={selected.size === 0 || paying} onClick={paySelected}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {paying ? 'A registar…' : `Marcar pagos (${selected.size})`}
            {selected.size > 0 && <span className="ml-1 opacity-80">· {formatCurrency(selectedTotal)}</span>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Nada por pagar. Está tudo em dia.</p>
        )}
        {groups.map(g => {
          const ids = g.rows.map(r => r.id);
          const allOn = ids.every(id => selected.has(id));
          const someOn = !allOn && ids.some(id => selected.has(id));
          const isOpen = open.has(g.key);
          const months = Array.from(new Set(g.rows.map(r => r.monthKey)));
          return (
            <div key={g.key} className="rounded-lg border border-border">
              <div className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={allOn ? true : someOn ? 'indeterminate' : false}
                  onCheckedChange={v => toggle(ids, !!v)}
                  aria-label={`Selecionar todos de ${g.name}`}
                />
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left min-w-0"
                  onClick={() => setOpen(prev => { const n = new Set(prev); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <span className="font-medium truncate">{g.name}</span>
                  <Badge variant="secondary" className="shrink-0">{g.rows.length}</Badge>
                </button>
                <PrivacyBlur><span className="font-semibold tabular-nums">{formatCurrency(g.total)}</span></PrivacyBlur>
              </div>
              {isOpen && (
                <div className="border-t border-border px-3 pb-3">
                  {months.map(mk => (
                    <div key={mk} className="mt-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 capitalize">{monthLabel(mk)}</p>
                      {g.rows.filter(r => r.monthKey === mk).map(r => (
                        <label key={r.id} className="flex items-center gap-3 py-1.5 text-sm cursor-pointer">
                          <Checkbox checked={selected.has(r.id)} onCheckedChange={v => toggle([r.id], !!v)} />
                          <span className="flex-1 truncate">{r.projectLabel}</span>
                          <PrivacyBlur><span className="tabular-nums">{formatCurrency(r.amount)}</span></PrivacyBlur>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
