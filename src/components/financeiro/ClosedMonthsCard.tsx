import { useState } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Lock, LockOpen } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Bloqueio de mês: num mês fechado não se alteram valores, equipa nem datas de
 * entrega dos trabalhos desse mês (regra garantida no servidor). Pagar continua permitido.
 */
export function ClosedMonthsCard() {
  const { currentWorkspace, isAdmin } = useWorkspace() as any;
  const { user } = useAuth();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id as string | undefined;
  const [busy, setBusy] = useState<string | null>(null);

  const { data: closed = [] } = useQuery({
    queryKey: ['closed-months', wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('closed_months').select('month').eq('workspace_id', wsId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.month as string);
    },
  });

  const months = Array.from({ length: 6 }, (_, i) => format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd'));

  const toggle = async (m: string, isClosed: boolean) => {
    if (!wsId || !user) return;
    setBusy(m);
    const q = (supabase as any).from('closed_months');
    const { error } = isClosed
      ? await q.delete().eq('workspace_id', wsId).eq('month', m)
      : await q.insert({ workspace_id: wsId, month: m, closed_by: user.id });
    setBusy(null);
    if (error) { toast.error('Só administradores podem fechar ou reabrir meses.'); return; }
    toast.success(isClosed ? 'Mês reaberto' : 'Mês fechado — valores desse mês ficam bloqueados');
    qc.invalidateQueries({ queryKey: ['closed-months', wsId] });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Meses fechados</CardTitle>
        <p className="text-sm text-muted-foreground">Num mês fechado não se alteram valores, equipa nem datas de entrega. Marcar como pago continua possível.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {months.map(m => {
          const isClosed = closed.includes(m);
          return (
            <Button key={m} variant={isClosed ? 'default' : 'outline'} size="sm" disabled={busy === m || isAdmin === false}
              onClick={() => toggle(m, isClosed)} className="justify-start capitalize">
              {isClosed ? <Lock className="h-3.5 w-3.5 mr-1" /> : <LockOpen className="h-3.5 w-3.5 mr-1" />}
              {format(new Date(`${m}T00:00:00`), 'MMM yyyy', { locale: pt })}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
