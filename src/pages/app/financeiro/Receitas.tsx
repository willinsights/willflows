import { useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { ProjectRevenueControl } from '@/components/payments/ProjectRevenueControl';

export default function Receitas() {
  const { clients } = useClients();
  const { formatCurrency } = useFormatCurrency();
  const { projectRevenue, handleProjectRevenueStatusChange } = usePaymentsData();

  const clientsList = useMemo(() => clients.map(c => ({ id: c.id, name: c.name })), [clients]);

  return (
    <ProjectRevenueControl
      projects={projectRevenue}
      clients={clientsList}
      onStatusChange={handleProjectRevenueStatusChange}
      formatCurrency={formatCurrency}
    />
  );
}
