import { forwardRef } from 'react';
import { FileSpreadsheet, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { UpgradeAlert } from '@/components/subscription/UpgradeAlert';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { exportToExcel } from '@/lib/excel-export';
import { generatePdfHtml, printPdf, type PdfStatItem, type PdfTableRow } from '@/lib/pdf-export';

export interface ExportData {
  id?: string;
  projeto: string;
  cliente?: string;
  contraparte?: string;
  vencimento?: string;
  status: string;
  valor: string;
  fase?: string;
  iban?: string;
  banco?: string;
  tipo?: string;
}

interface ForecastSummary {
  receivable: string;
  totalPayable: string;
  net: string;
  teamTotal?: string;
  teamCaptacao?: string;
  teamEdicao?: string;
  custosExtras?: string;
  payable?: string;
  month?: string;
}

interface PaymentExportButtonsProps {
  data: ExportData[];
  filename: string;
  type: 'clients' | 'freelancers' | 'invoices' | 'previsao' | 'custos';
  forecastSummary?: ForecastSummary;
  workspaceName?: string;
}

// Professional report titles
const typeLabels: Record<string, string> = {
  clients: 'Receita de Clientes',
  freelancers: 'Pagamentos a Colaboradores',
  invoices: 'Faturas',
  previsao: 'Relatório de Previsão Financeira',
  custos: 'Custos Extras de Projetos',
};

// Column labels per export type
const columnLabelsMap: Record<string, Record<string, string>> = {
  clients: {
    id: 'Código',
    projeto: 'Projeto',
    contraparte: 'Cliente',
    vencimento: 'Data Vencimento',
    status: 'Status',
    valor: 'Preço Cliente',
  },
  freelancers: {
    id: 'Código',
    projeto: 'Projeto',
    cliente: 'Cliente',
    contraparte: 'Colaborador',
    fase: 'Fase',
    vencimento: 'Data Vencimento',
    status: 'Status Pagamento',
    valor: 'Valor a Pagar',
    iban: 'IBAN',
    banco: 'Banco',
  },
  custos: {
    id: 'Código',
    projeto: 'Projeto',
    cliente: 'Cliente',
    status: 'Status',
    valor: 'Custo Extra',
  },
  previsao: {
    id: 'Código',
    projeto: 'Projeto',
    contraparte: 'Entidade',
    tipo: 'Tipo',
    vencimento: 'Data Vencimento',
    status: 'Status',
    valor: 'Valor',
  },
  invoices: {
    id: 'Código',
    projeto: 'Projeto',
    contraparte: 'Entidade',
    vencimento: 'Data Vencimento',
    status: 'Status',
    valor: 'Valor',
  },
};

export const PaymentExportButtons = forwardRef<HTMLDivElement, PaymentExportButtonsProps>(function PaymentExportButtons({ 
  data, 
  filename, 
  type, 
  forecastSummary,
  workspaceName = 'WillFlow',
}, ref) {
  const { toast } = useToast();
  const { 
    canUseFeature, 
    checkFeature, 
    upgradeAlert, 
    closeUpgradeAlert, 
    currentPlan 
  } = usePlanFeatures();
  
  const canExportExcel = canUseFeature('exportExcel');
  const canExportPdf = canUseFeature('exportPdf');

  const currentDateFile = format(new Date(), 'yyyy-MM-dd', { locale: pt });
  const reportTitle = typeLabels[type] || 'Relatório';

  const getColumnLabels = () => columnLabelsMap[type] || columnLabelsMap.clients;

  // Get relevant keys based on export type (only include columns that have data)
  const getRelevantKeys = () => {
    const labels = getColumnLabels();
    const allKeys = Object.keys(labels);
    
    // Filter out columns that have no data
    return allKeys.filter(key => {
      return data.some(row => {
        const value = row[key as keyof ExportData];
        return value !== undefined && value !== null && value !== '' && value !== '-';
      });
    });
  };

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const calculateTotals = () => {
    return data.reduce((acc, row) => {
      const valorStr = row.valor.replace(/[^\d,.-]/g, '').replace(',', '.');
      const valor = parseFloat(valorStr) || 0;
      if (row.status === 'Pago') {
        acc.pago += Math.abs(valor);
      } else if (row.status === 'Pendente') {
        acc.pendente += Math.abs(valor);
      } else if (row.status === 'Vencido') {
        acc.vencido += Math.abs(valor);
      }
      acc.total += Math.abs(valor);
      return acc;
    }, { pago: 0, pendente: 0, vencido: 0, total: 0 });
  };

  /**
   * Export to Excel using centralized utility
   */
  const handleExportToExcel = async () => {
    if (data.length === 0 && !forecastSummary) {
      toast({
        title: 'Sem dados',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    const labels = getColumnLabels();
    const keys = getRelevantKeys();

    try {
      await exportToExcel({
        title: reportTitle,
        subtitle: workspaceName,
        headers: keys.map(k => labels[k]),
        data: data.map(row => keys.map(key => String(row[key as keyof ExportData] || '-'))),
        filename: `${filename}-${currentDateFile}`,
      });

      toast({
        title: 'Exportado com sucesso',
        description: `Ficheiro Excel exportado com ${data.length} registos`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar o ficheiro',
        variant: 'destructive',
      });
    }
  };

  /**
   * Export to PDF using centralized utility with unified styling
   */
  const handleExportToPdf = () => {
    if (data.length === 0 && !forecastSummary) {
      toast({
        title: 'Sem dados',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    const labels = getColumnLabels();
    const keys = getRelevantKeys();
    const headers = keys.map(k => labels[k]);
    const totals = calculateTotals();

    // Build stats bar based on type
    let statsBar: PdfStatItem[] = [];
    
    if (type === 'previsao' && forecastSummary) {
      const isPositiveNet = !forecastSummary.net.includes('-');
      statsBar = [
        { label: 'Previsão de Entrada', value: forecastSummary.receivable, className: 'success' },
        { label: 'Previsão de Saída', value: forecastSummary.totalPayable, className: 'destructive' },
        { label: 'Saldo Previsto', value: forecastSummary.net, className: isPositiveNet ? 'success' : 'destructive' },
      ];
    } else {
      statsBar = [
        { label: 'Total Geral', value: formatCurrencyValue(totals.total), className: 'primary' },
        { label: 'Pago', value: formatCurrencyValue(totals.pago), className: 'success' },
        { label: 'Pendente', value: formatCurrencyValue(totals.pendente), className: 'warning' },
        { label: 'Vencido', value: formatCurrencyValue(totals.vencido), className: 'destructive' },
      ];
    }

    // Build table rows with proper styling
    const tableRows: PdfTableRow[] = data.map(row => ({
      cells: keys.map(key => {
        const value = String(row[key as keyof ExportData] || '-');
        
        // Status column with badge styling
        if (key === 'status') {
          const statusClass = value.toLowerCase().replace(/\s/g, '');
          return { 
            value: `<span class="status-badge status-${statusClass}">${value}</span>`,
            className: ''
          };
        }
        
        // Value column with color coding
        if (key === 'valor') {
          if (type === 'clients' || value.startsWith('+')) {
            return { value, className: 'positive' };
          } else if (type === 'freelancers' || type === 'custos' || value.startsWith('-')) {
            return { value, className: 'negative' };
          }
        }
        
        return value;
      }),
    }));

    const title = type === 'previsao' && forecastSummary?.month 
      ? `Relatório de Previsão - ${forecastSummary.month}`
      : reportTitle;

    const html = generatePdfHtml({
      title,
      workspaceName,
      statsBar,
      headers,
      data: tableRows,
      totalLabel: `Total: ${data.length} registos`,
    });

    printPdf(html);

    toast({
      title: 'PDF gerado',
      description: 'Janela de impressão aberta',
    });
  };

  const handleExcelClick = () => {
    if (!canExportExcel) {
      checkFeature('exportExcel');
      return;
    }
    handleExportToExcel();
  };

  const handlePdfClick = () => {
    if (!canExportPdf) {
      checkFeature('exportPdf');
      return;
    }
    handleExportToPdf();
  };

  return (
    <>
      <div className="flex gap-2">
        {canExportExcel ? (
          <Button variant="outline" size="sm" onClick={handleExcelClick}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="opacity-60" onClick={handleExcelClick}>
                  <Lock className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Disponível nos planos Pro e Studio</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {canExportPdf ? (
          <Button variant="outline" size="sm" onClick={handlePdfClick}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="opacity-60" onClick={handlePdfClick}>
                  <Lock className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Disponível nos planos Pro e Studio</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <UpgradeAlert
        isOpen={upgradeAlert.isOpen}
        onClose={closeUpgradeAlert}
        feature={upgradeAlert.feature}
        requiredPlan={upgradeAlert.requiredPlan}
        currentPlan={currentPlan}
        isLimitReached={upgradeAlert.isLimitReached}
      />
    </>
  );
});
