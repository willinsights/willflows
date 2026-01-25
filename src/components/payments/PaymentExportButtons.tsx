import { forwardRef } from 'react';
import { FileSpreadsheet, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { UpgradeAlert } from '@/components/subscription/UpgradeAlert';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export interface ExportData {
  id?: string;
  projeto: string;
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

  const currentDateTime = format(new Date(), "dd MMM yyyy 'às' HH:mm", { locale: pt });
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

  const exportToCSV = () => {
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
    
    // BOM for UTF-8
    let csvContent = '\ufeff';
    
    // Add professional header
    csvContent += `"${reportTitle}"\n`;
    csvContent += `"${workspaceName}"\n`;
    csvContent += `"Exportado: ${currentDateTime}"\n`;
    csvContent += `"Total: ${data.length} registos"\n\n`;

    // Add forecast summary for previsao type
    if (type === 'previsao' && forecastSummary) {
      csvContent += `"RESUMO FINANCEIRO"\n`;
      csvContent += `"Previsão de Entrada";"${forecastSummary.receivable}"\n`;
      csvContent += `"Previsão de Saída";"${forecastSummary.totalPayable}"\n`;
      csvContent += `"Saldo Previsto";"${forecastSummary.net}"\n\n`;
      
      if (forecastSummary.teamTotal || forecastSummary.custosExtras || forecastSummary.payable) {
        csvContent += `"DETALHES DE SAÍDAS"\n`;
        if (forecastSummary.teamTotal && forecastSummary.teamTotal !== '0') {
          csvContent += `"A Pagar Colaboradores";"${forecastSummary.teamTotal}"\n`;
          if (forecastSummary.teamCaptacao) csvContent += `"  - Captação";"${forecastSummary.teamCaptacao}"\n`;
          if (forecastSummary.teamEdicao) csvContent += `"  - Edição";"${forecastSummary.teamEdicao}"\n`;
        }
        if (forecastSummary.custosExtras && forecastSummary.custosExtras !== '0') {
          csvContent += `"Custos Extras";"${forecastSummary.custosExtras}"\n`;
        }
        if (forecastSummary.payable && forecastSummary.payable !== '0') {
          csvContent += `"Outros Pagamentos";"${forecastSummary.payable}"\n`;
        }
        csvContent += '\n';
      }
      
      csvContent += `"MOVIMENTOS DO MÊS"\n`;
    }

    // Add data headers and rows
    csvContent += headers.map(h => `"${h}"`).join(';') + '\n';
    
    data.forEach(row => {
      const cells = keys.map(key => {
        const value = row[key as keyof ExportData] || '-';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvContent += cells.join(';') + '\n';
    });

    // Calculate and add totals
    const totals = calculateTotals();
    csvContent += '\n"TOTAIS"\n';
    if (type === 'clients') {
      csvContent += `"Total Pago";"${formatCurrencyValue(totals.pago)}"\n`;
      csvContent += `"Total Pendente";"${formatCurrencyValue(totals.pendente)}"\n`;
      csvContent += `"Total Vencido";"${formatCurrencyValue(totals.vencido)}"\n`;
    }
    csvContent += `"Total Geral";"${formatCurrencyValue(totals.total)}"\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${currentDateFile}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportado com sucesso',
      description: `Ficheiro ${filename}.csv exportado com ${data.length} registos`,
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

  const exportToPDF = () => {
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

    const tableRows = data.map(row => {
      const cells = keys.map(key => {
        const value = row[key as keyof ExportData] || '-';
        let className = '';
        
        if (key === 'status') {
          const statusClass = String(value).toLowerCase().replace(/\s/g, '');
          return `<td><span class="status-badge status-${statusClass}">${value}</span></td>`;
        }
        
        if (key === 'valor') {
          if (type === 'clients' || String(value).startsWith('+')) {
            className = 'valor-positivo';
          } else if (type === 'freelancers' || type === 'custos' || String(value).startsWith('-')) {
            className = 'valor-negativo';
          }
        }
        
        return `<td class="${className}">${value}</td>`;
      }).join('');
      
      return `<tr>${cells}</tr>`;
    }).join('');

    // Build forecast summary section for previsao type
    let forecastSection = '';
    if (type === 'previsao' && forecastSummary) {
      const isPositiveNet = !forecastSummary.net.includes('-');
      forecastSection = `
        <div class="forecast-summary">
          <div class="forecast-cards">
            <div class="forecast-card income">
              <div class="card-label">Previsão de Entrada</div>
              <div class="card-value income-value">${forecastSummary.receivable}</div>
              <div class="card-sublabel">Pagamentos de clientes</div>
            </div>
            <div class="forecast-card expense">
              <div class="card-label">Previsão de Saída</div>
              <div class="card-value expense-value">${forecastSummary.totalPayable}</div>
              <div class="card-sublabel">Colaboradores + Custos</div>
            </div>
            <div class="forecast-card balance">
              <div class="card-label">Saldo Previsto</div>
              <div class="card-value ${isPositiveNet ? 'income-value' : 'expense-value'}">${forecastSummary.net}</div>
            </div>
          </div>
          
          ${(forecastSummary.teamTotal && forecastSummary.teamTotal !== '0,00 €' && forecastSummary.teamTotal !== '0') || 
            (forecastSummary.custosExtras && forecastSummary.custosExtras !== '0,00 €' && forecastSummary.custosExtras !== '0') ||
            (forecastSummary.payable && forecastSummary.payable !== '0,00 €' && forecastSummary.payable !== '0') ? `
          <div class="details-section">
            <h3>📊 Detalhes de Saídas Previstas</h3>
            <table class="details-table">
              ${forecastSummary.teamTotal && forecastSummary.teamTotal !== '0,00 €' && forecastSummary.teamTotal !== '0' ? `
              <tr>
                <td class="detail-label">👥 A Pagar Colaboradores</td>
                <td class="detail-value expense-value">${forecastSummary.teamTotal}</td>
              </tr>
              ${forecastSummary.teamCaptacao && forecastSummary.teamCaptacao !== '0,00 €' ? `
              <tr class="subrow">
                <td class="detail-label sublabel">Captação</td>
                <td class="detail-value">${forecastSummary.teamCaptacao}</td>
              </tr>
              ` : ''}
              ${forecastSummary.teamEdicao && forecastSummary.teamEdicao !== '0,00 €' ? `
              <tr class="subrow">
                <td class="detail-label sublabel">Edição</td>
                <td class="detail-value">${forecastSummary.teamEdicao}</td>
              </tr>
              ` : ''}
              ` : ''}
              ${forecastSummary.custosExtras && forecastSummary.custosExtras !== '0,00 €' && forecastSummary.custosExtras !== '0' ? `
              <tr>
                <td class="detail-label">📦 Custos Extras</td>
                <td class="detail-value expense-value">${forecastSummary.custosExtras}</td>
              </tr>
              ` : ''}
              ${forecastSummary.payable && forecastSummary.payable !== '0,00 €' && forecastSummary.payable !== '0' ? `
              <tr>
                <td class="detail-label">💳 Outros Pagamentos</td>
                <td class="detail-value expense-value">${forecastSummary.payable}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          ` : ''}
        </div>
      `;
    }

    const title = type === 'previsao' && forecastSummary?.month 
      ? `Relatório de Previsão - ${forecastSummary.month}`
      : reportTitle;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} - ${workspaceName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif; 
            padding: 40px; 
            background: #fff;
            color: #1a1a1a;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 3px solid #8224e3;
            padding-bottom: 20px;
          }
          .brand h1 { 
            color: #8224e3; 
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .brand .workspace-name {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
          }
          .meta {
            text-align: right;
            font-size: 12px;
            color: #6b7280;
          }
          .meta p { margin-bottom: 4px; }
          
          /* Stats bar */
          .stats-bar {
            display: flex;
            gap: 24px;
            margin-bottom: 24px;
            padding: 16px 20px;
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            border-radius: 12px;
          }
          .stat-item { text-align: center; }
          .stat-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .stat-value { font-size: 18px; font-weight: 700; }
          .stat-value.success { color: #16a34a; }
          .stat-value.warning { color: #ca8a04; }
          .stat-value.destructive { color: #dc2626; }
          
          /* Forecast Summary Styles */
          .forecast-summary { margin-bottom: 30px; }
          .forecast-cards {
            display: flex;
            gap: 20px;
            margin-bottom: 25px;
          }
          .forecast-card {
            flex: 1;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e5e7eb;
          }
          .forecast-card.income { border-left: 4px solid #22c55e; background: #f0fdf4; }
          .forecast-card.expense { border-left: 4px solid #ef4444; background: #fef2f2; }
          .forecast-card.balance { border-left: 4px solid #6366f1; background: #eef2ff; }
          .card-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .card-value { font-size: 28px; font-weight: 700; }
          .income-value { color: #16a34a; }
          .expense-value { color: #dc2626; }
          .card-sublabel {
            font-size: 11px;
            color: #888;
            margin-top: 5px;
          }
          
          .details-section {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            border: 1px solid #e5e7eb;
          }
          .details-section h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #374151;
          }
          .details-table { width: 100%; border-collapse: collapse; }
          .details-table tr { border-bottom: 1px solid #e5e7eb; }
          .details-table tr:last-child { border-bottom: none; }
          .details-table td { padding: 12px 8px; }
          .detail-label { font-weight: 500; }
          .detail-label.sublabel {
            padding-left: 30px;
            font-weight: 400;
            color: #666;
          }
          .detail-value { text-align: right; font-weight: 600; }
          .subrow td { padding: 8px; }
          
          /* Main Table Styles */
          h2 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #374151;
          }
          table.main-table { 
            width: 100%; 
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
          }
          table.main-table th { 
            background: linear-gradient(135deg, #8224e3 0%, #6b21a8 100%);
            color: white;
            text-align: left;
            padding: 12px 10px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          table.main-table th:first-child { border-radius: 8px 0 0 0; }
          table.main-table th:last-child { border-radius: 0 8px 0 0; }
          table.main-table td { 
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          table.main-table tr:nth-child(even) { background: #f9fafb; }
          table.main-table tr:hover { background: #f3f4f6; }
          
          /* Status badges */
          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .status-pago { background: #dcfce7; color: #16a34a; }
          .status-pendente { background: #fef9c3; color: #ca8a04; }
          .status-vencido { background: #fee2e2; color: #dc2626; }
          .status-cancelado { background: #f3f4f6; color: #6b7280; }
          
          .valor-positivo { color: #16a34a; font-weight: 600; }
          .valor-negativo { color: #dc2626; font-weight: 600; }
          
          .empty-message {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
          }
          
          .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
          }
          
          @media print {
            body { padding: 20px; }
            .forecast-cards { page-break-inside: avoid; }
            .header { margin-bottom: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>📊 ${title}</h1>
            <p class="workspace-name">${workspaceName}</p>
          </div>
          <div class="meta">
            <p><strong>Exportado:</strong> ${currentDateTime}</p>
            <p><strong>Total:</strong> ${data.length} registos</p>
          </div>
        </div>
        
        ${type !== 'previsao' ? `
        <div class="stats-bar">
          <div class="stat-item">
            <div class="stat-label">Total Geral</div>
            <div class="stat-value">${formatCurrencyValue(totals.total)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Pago</div>
            <div class="stat-value success">${formatCurrencyValue(totals.pago)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Pendente</div>
            <div class="stat-value warning">${formatCurrencyValue(totals.pendente)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Vencido</div>
            <div class="stat-value destructive">${formatCurrencyValue(totals.vencido)}</div>
          </div>
        </div>
        ` : ''}
        
        ${forecastSection}
        
        ${data.length > 0 ? `
        <h2>📋 ${type === 'previsao' ? 'Movimentos do Mês' : 'Detalhes'}</h2>
        <table class="main-table">
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        ` : type !== 'previsao' ? '<p class="empty-message">Sem movimentos registados</p>' : ''}
        
        <div class="footer">
          Gerado por ${workspaceName} • willflow.app
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };
    }

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
    exportToCSV();
  };

  const handlePdfClick = () => {
    if (!canExportPdf) {
      checkFeature('exportPdf');
      return;
    }
    exportToPDF();
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
