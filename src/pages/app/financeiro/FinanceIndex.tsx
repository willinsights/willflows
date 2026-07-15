import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

import FinanceiroHub from './FinanceiroHub';
import { FINANCE_TABS, type FinanceTab } from './tabs';

const FinanceVisao = lazy(() => import('./FinanceVisao'));
const Movimentos = lazy(() => import('./Movimentos'));
const Colaboradores = lazy(() => import('./Colaboradores'));
const Relatorios = lazy(() => import('@/pages/app/Relatorios'));

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
      {tab === 'visao'         && <FinanceVisao />}
      {tab === 'fechos'        && <FinanceiroHub />}
      {tab === 'movimentos'    && <Movimentos />}
      {tab === 'colaboradores' && <Colaboradores />}
      {tab === 'relatorios'    && <Relatorios />}
    </Suspense>
  );
}
