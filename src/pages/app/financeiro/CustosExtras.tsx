import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { ExtraCostsPaymentsControl } from '@/components/payments/ExtraCostsPaymentsControl';

export default function CustosExtras() {
  const { formatCurrency } = useFormatCurrency();
  const { allProjectCosts, handleCostStatusChange } = usePaymentsData();

  return (
    <ExtraCostsPaymentsControl
      projectCosts={allProjectCosts}
      onStatusChange={handleCostStatusChange}
      formatCurrency={formatCurrency}
    />
  );
}
