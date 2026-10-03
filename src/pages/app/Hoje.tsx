import { Link } from 'react-router-dom';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CheckSquare, ClipboardList, CalendarDays, Clapperboard, PauseCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodayAgenda } from '@/hooks/useTodayAgenda';
import { WORK_LOG_STATUS_LABELS } from '@/hooks/useWorkLogs';

const code = (p: { project_code: string | null; id: string }) => p.project_code || p.id.slice(0, 8);

function Section({ id, icon: Icon, title, count, empty, children }: {
  id?: string; icon: typeof CheckSquare; title: string; count: number; empty: string; children: React.ReactNode;
}) {
  return (
    <Card id={id}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> {title}
          <Badge variant="secondary" className="ml-auto">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {count === 0 ? <p className="text-sm text-muted-foreground py-2">{empty}</p> : children}
      </CardContent>
    </Card>
  );
}

function Row({ to, title, meta, tone }: { to: string; title: string; meta: string; tone?: 'danger' }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <span className="text-sm truncate">{title}</span>
      <span className={`text-xs shrink-0 ${tone === 'danger' ? 'text-destructive' : 'text-muted-foreground'}`}>{meta}</span>
    </Link>
  );
}

export default function Hoje() {
  const { data, isLoading } = useTodayAgenda();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });

  return (
    <div className="p-3 md:p-4 max-w-4xl mx-auto space-y-4 pb-24">
      <PageHeader title="Hoje" description={<span className="capitalize">{today}</span>} />
      {isLoading || !data ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Section icon={CalendarDays} title="Eventos de hoje" count={data.events.length} empty="Sem eventos hoje.">
            {data.events.map(e => (
              <Row key={e.id} to="/app/calendario" title={e.title}
                meta={e.all_day ? 'Dia todo' : format(parseISO(e.start_at), 'HH:mm')} />
            ))}
          </Section>
          <Section icon={Clapperboard} title="Projetos: captações e entregas" count={data.projects.length} empty="Nenhuma captação ou entrega para hoje.">
            {data.projects.map(p => (
              <Row key={p.id} to={p.kind === 'captacao' ? '/app/captacao' : '/app/edicao'}
                title={`${code(p)} · ${p.name}`}
                meta={p.kind === 'captacao' ? 'Captação hoje' : p.kind === 'entrega' ? 'Entrega hoje' : `Entrega atrasada (${format(parseISO(p.date), 'd MMM', { locale: pt })})`}
                tone={p.kind === 'atrasado' ? 'danger' : undefined} />
            ))}
          </Section>
          <Section icon={CheckSquare} title="As minhas tarefas" count={data.tasks.length} empty="Sem tarefas para hoje.">
            {data.tasks.map(t => (
              <Row key={t.id} to="/app/edicao" title={t.title}
                meta={t.overdue && t.due_date ? `Atrasada (${format(parseISO(t.due_date), 'd MMM', { locale: pt })})` : 'Hoje'}
                tone={t.overdue ? 'danger' : undefined} />
            ))}
          </Section>
          <Section icon={ClipboardList} title="Os meus trabalhos em aberto" count={data.works.length} empty="Sem trabalhos em aberto.">
            {data.works.map(w => (
              <Row key={w.id} to="/app/trabalhos" title={w.title}
                meta={w.is_urgent ? 'Urgente' : (WORK_LOG_STATUS_LABELS as Record<string, string>)[w.status] ?? w.status}
                tone={w.is_urgent ? 'danger' : undefined} />
            ))}
          </Section>
          <div className="md:col-span-2">
            <Section id="parados" icon={PauseCircle} title="Projetos parados (sem alterações há mais de 14 dias)" count={data.stalled.length} empty="Nenhum projeto parado.">
              {data.stalled.map(p => (
                <Row key={p.id} to="/app/edicao" title={`${code(p)} · ${p.name}`}
                  meta={`há ${formatDistanceToNow(parseISO(p.updated_at), { locale: pt })}`} />
              ))}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
