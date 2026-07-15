import { useMemo } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PageHeader } from '@/components/layout/PageHeader';

import { usePayments } from '@/hooks/usePayments';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useHideValues } from '@/hooks/useHideValues';
import { cn } from '@/lib/utils';

import { FINANCE_TABS, type FinanceTab } from './tabs';

/**
 * Finance module shell.
 *
 * Renders:
 *   • Page header (title + hide-values toggle)
 *   • Top-level tab strip driven by ?tab= (visao|fechos|movimentos|colaboradores|relatorios)
 *   • <Outlet /> for both the index route (rendered by FinanceIndex) and legacy child routes
 */
export default function FinanceiroLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isIndex =
    location.pathname === '/app/financeiro' || location.pathname === '/app/financeiro/';

  const { loading } = usePayments();
  const {
    canViewAllFinancials,
    canViewOwnFinancials,
    isLoading: permissionsLoading,
  } = useFinancialPermissions();
  const { hideValues, toggleHideValues } = useHideValues();

  const activeTab = useMemo<FinanceTab>(() => {
    const raw = searchParams.get('tab') as FinanceTab | null;
    return raw && FINANCE_TABS.some((t) => t.id === raw) ? raw : 'visao';
  }, [searchParams]);

  const handleTabClick = (id: FinanceTab, enabled: boolean) => {
    if (!enabled) return;
    const next = new URLSearchParams(searchParams);
    if (id === 'visao') next.delete('tab');
    else next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  if (loading || permissionsLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64 hidden sm:block" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!canViewOwnFinancials) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Lock className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Não tens permissão para aceder a informação financeira.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Finanças"
        description={
          canViewAllFinancials
            ? 'Controlo de receitas, custos e fechos'
            : 'Os teus pagamentos'
        }
        actions={
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleHideValues}
                  className="h-9 w-9"
                  aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
                >
                  {hideValues ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {hideValues ? 'Mostrar valores' : 'Ocultar valores'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      {/* Top-level tabs — only on index route */}
      {isIndex && canViewAllFinancials && (
        <ScrollArea className="w-full">
          <nav
            className="inline-flex items-center gap-1 rounded-lg bg-muted/50 p-1 min-w-max"
            aria-label="Secções de Finanças"
          >
            {FINANCE_TABS.map((t) => {
              const active = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!t.enabled}
                  onClick={() => handleTabClick(t.id, t.enabled)}
                  className={cn(
                    'relative px-3.5 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                    !t.enabled && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {t.label}
                  {!t.enabled && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider text-muted-foreground/70">
                      em breve
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <ScrollBar orientation="horizontal" className="sm:hidden" />
        </ScrollArea>
      )}

      {/* Tab / route content */}
      <Outlet />
    </div>
  );
}
