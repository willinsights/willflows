import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

import FinanceiroHub from './FinanceiroHub';
import { FINANCE_TABS, type FinanceTab } from './tabs';

const FinanceVisao = lazy(() => import('./FinanceVisao'));

/**
 * Tab switcher for /app/financeiro.
 * Tabs are declared in ./tabs.ts and rendered from ./FinanceiroLayout.
 * This component decides which panel to render based on ?tab=.
 */
export default function FinanceIndex() {
  const [params] = useSearchParams();
  const raw = (params.get('tab') as FinanceTab | null) || 'visao';
  const enabled = FINANCE_TABS.find((t) => t.id === raw && t.enabled);
  const tab: FinanceTab = enabled ? raw : 'visao';

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      {tab === 'visao'  && <FinanceVisao />}
      {tab === 'fechos' && <FinanceiroHub />}
      {tab === 'movimentos'    && <ComingSoon title="Movimentos" description="Feed unificado de receitas e custos com virtual scroll, filtros em chips e detalhe lateral. Chega na Fase 3 do redesign." />}
      {tab === 'colaboradores' && <ComingSoon title="Colaboradores" description="Vista agregada por editor com pagamentos pendentes cross-fecho." />}
      {tab === 'relatorios'    && <ComingSoon title="Relatórios" description="A absorver /app/relatorios com exportações centralizadas." />}
    </Suspense>
  );
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-card rounded-xl border p-10 text-center">
      <Sparkles className="h-10 w-10 mx-auto text-primary/60 mb-3" />
      <p className="text-lg font-semibold mb-2">{title}</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
    </div>
  );
}
