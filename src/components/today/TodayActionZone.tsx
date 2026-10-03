import { Link } from 'react-router-dom';
import { CalendarCheck, Wallet, PauseCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodayAgenda, usePendingTeamPayables } from '@/hooks/useTodayAgenda';
import { useHideValues } from '@/contexts/HideValuesContext';

const eur = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

function ActionCard({ to, icon: Icon, label, value, hint, loading }: {
  to: string; icon: typeof Wallet; label: string; value: string; hint: string; loading: boolean;
}) {
  return (
    <Link to={to} className="group">
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? <Skeleton className="h-7 w-20 mt-1" /> : <p className="text-2xl font-semibold leading-tight">{value}</p>}
            <p className="text-xs text-muted-foreground truncate">{hint}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    </Link>
  );
}

/** Dashboard top zone: only cards that lead to a decision. */
export function TodayActionZone({ showPayables }: { showPayables: boolean }) {
  const { data, isLoading } = useTodayAgenda();
  const payables = usePendingTeamPayables(showPayables);
  const { hideValues } = useHideValues();
  const todayCount = data ? data.tasks.length + data.works.length + data.events.length + data.projects.length : 0;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${showPayables ? 'lg:grid-cols-3' : ''} gap-3`}>
      <ActionCard to="/app/hoje" icon={CalendarCheck} label="Hoje" loading={isLoading}
        value={String(todayCount)} hint={todayCount ? 'tarefas, trabalhos e eventos para hoje' : 'Nada pendente para hoje'} />
      {showPayables && (
        <ActionCard to="/app/financeiro?tab=colaboradores" icon={Wallet} label="A pagar à equipa" loading={payables.isLoading}
          value={hideValues ? '•••' : eur(payables.data?.total ?? 0)}
          hint={`${payables.data?.count ?? 0} trabalhos entregues · ${payables.data?.people ?? 0} pessoas`} />
      )}
      <ActionCard to="/app/hoje#parados" icon={PauseCircle} label="Projetos parados" loading={isLoading}
        value={String(data?.stalled.length ?? 0)} hint="Sem alterações há mais de 14 dias" />
    </div>
  );
}
