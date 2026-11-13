import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function FinancialDataState({ loading, error, onRetry, children }: {
  loading: boolean; error: unknown; onRetry: () => void; children?: ReactNode;
}) {
  if (error) return <div role="alert" className="space-y-3 py-6">
    <p className="text-destructive">Não foi possível carregar os dados financeiros.</p>
    <Button variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
  </div>;
  if (loading) return <div role="status" aria-label="Carregando dados financeiros" className="space-y-3 py-6">
    <Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" />
  </div>;
  return <>{children}</>;
}
