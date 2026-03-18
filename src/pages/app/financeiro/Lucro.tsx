import { useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ProfitControl } from '@/components/payments/ProfitControl';

export default function Lucro() {
  const { clients } = useClients();
  const { currentWorkspace } = useWorkspace();
  const { formatCurrency } = useFormatCurrency();

  const clientsList = useMemo(() => clients.map(c => ({ id: c.id, name: c.name })), [clients]);

  return (
    <ProfitControl
      clients={clientsList}
      formatCurrency={formatCurrency}
      workspaceName={currentWorkspace?.name}
    />
  );
}
