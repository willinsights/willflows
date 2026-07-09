import { useMemo, useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useMonthlyClosing, type ClosingSettlement } from '@/hooks/useMonthlyClosing';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { ClosingSummaryCards } from '@/components/payments/closing/ClosingSummaryCards';
import { ClosingByEditor } from '@/components/payments/closing/ClosingByEditor';
import { ClosingSettlementsTable } from '@/components/payments/closing/ClosingSettlementsTable';
import { MarkClosingPaidDialog } from '@/components/payments/closing/MarkClosingPaidDialog';
import { PaymentExportButtons } from '@/components/payments/PaymentExportButtons';
import { paymentStatusLabels } from '@/lib/finance/constants';

export default function FechoMensal() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);

  const { canViewAllFinancials } = useFinancialPermissions();
  const { members } = useWorkspaceMembers();
  const { formatCurrency } = useFormatCurrency();
  const { handleFreelancerStatusChange, handleCostStatusChange } = usePaymentsData();
  const closing = useMonthlyClosing(currentMonth);

  // Freelancer view = single-member active workspace OR no full financial access
  const activeMembers = members.filter((m) => m.is_active).length;
  const isFreelancerView = !canViewAllFinancials || activeMembers <= 1;

  const pending = useMemo(
    () => closing.settlements.filter((s) => s.status !== 'pago' && s.status !== 'cancelado'),
    [closing.settlements],
  );
  const pendingTotal = pending.reduce((s, r) => s + r.amount, 0);

  const exportData = useMemo(
    () => closing.settlements.map((s) => ({
      id: s.projectCode,
      projeto: s.projectName,
      contraparte: s.editorName,
      tipo: s.type === 'editor' ? 'Edição' : 'Custo extra',
      vencimento: s.deliveredAt ? format(new Date(s.deliveredAt), 'dd/MM/yyyy', { locale: pt }) : '-',
      status: paymentStatusLabels[s.status] || s.status,
      valor: `-${formatCurrency(s.amount)}`,
    })),
    [closing.settlements, formatCurrency],
  );

  const forecastSummary = useMemo(() => ({
    totalReceivable: formatCurrency(closing.revenue),
    alreadyReceived: '—',
    pendingReceivable: formatCurrency(closing.revenue),
    receivable: formatCurrency(closing.revenue),
    totalPayable: formatCurrency(closing.editorPayable),
    net: formatCurrency(closing.ownerProfit),
    teamTotal: '—', teamCaptacao: '—', teamEdicao: '—', custosExtras: '—',
    payable: formatCurrency(closing.editorPayable),
    month: format(currentMonth, 'MMMM yyyy', { locale: pt }),
  }), [closing, currentMonth, formatCurrency]);

  const handleMarkPaid = async (rows: ClosingSettlement[]) => {
    for (const r of rows) {
      if (r.type === 'editor' && r.teamId) {
        await handleFreelancerStatusChange(r.teamId, 'pago');
      } else if (r.type === 'extra') {
        await handleCostStatusChange(r.projectId, 'pago');
      }
    }
  };

  if (!canViewAllFinancials && isFreelancerView === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Lock className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Sem permissão para ver o fecho mensal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month selector + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="min-w-[160px]" onClick={() => setCurrentMonth(new Date())}>
            {format(currentMonth, 'MMMM yyyy', { locale: pt })}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Apenas projetos entregues
          </Badge>
          <PaymentExportButtons
            data={exportData}
            filename={`fecho-${format(currentMonth, 'yyyy-MM')}`}
            type="previsao"
            forecastSummary={forecastSummary}
          />
          {!isFreelancerView && (
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={pending.length === 0}
              size="sm"
            >
              Marcar fecho como pago
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <ClosingSummaryCards
        revenue={formatCurrency(closing.revenue)}
        editorPayable={formatCurrency(closing.editorPayable)}
        ownerProfit={formatCurrency(closing.ownerProfit)}
        alreadyPaid={formatCurrency(closing.alreadyPaid)}
        simple={isFreelancerView}
        simpleValue={formatCurrency(closing.ownerProfit)}
      />

      {/* By editor */}
      {!isFreelancerView && (
        <ClosingByEditor byEditor={closing.byEditor} formatCurrency={formatCurrency} />
      )}

      {/* Settlements */}
      <ClosingSettlementsTable
        settlements={closing.settlements}
        formatCurrency={formatCurrency}
        hideEditorColumn={isFreelancerView}
      />

      <MarkClosingPaidDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={pending}
        totalLabel={formatCurrency(pendingTotal)}
        onConfirm={handleMarkPaid}
      />
    </div>
  );
}
