import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ExportData {
  projeto: string;
  contraparte: string;
  vencimento?: string;
  status: string;
  valor: string;
  fase?: string;
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
  type: 'clients' | 'freelancers' | 'invoices' | 'previsao';
  forecastSummary?: ForecastSummary;
}

export function PaymentExportButtons({ data, filename, type, forecastSummary }: PaymentExportButtonsProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (data.length === 0 && !forecastSummary) {
      toast({
        title: 'Sem dados',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    let csvContent = '';

    // Add forecast summary for previsao type
    if (type === 'previsao' && forecastSummary) {
      csvContent += `RELATÓRIO DE PREVISÃO - ${forecastSummary.month || ''}\n\n`;
      csvContent += `RESUMO\n`;
      csvContent += `Previsão de Entrada;${forecastSummary.receivable}\n`;
      csvContent += `Previsão de Saída;${forecastSummary.totalPayable}\n`;
      csvContent += `Saldo Previsto;${forecastSummary.net}\n\n`;
      
      if (forecastSummary.teamTotal || forecastSummary.custosExtras || forecastSummary.payable) {
        csvContent += `DETALHES DE SAÍDAS\n`;
        if (forecastSummary.teamTotal && forecastSummary.teamTotal !== '0') {
          csvContent += `A Pagar Colaboradores;${forecastSummary.teamTotal}\n`;
          if (forecastSummary.teamCaptacao) csvContent += `  - Captação;${forecastSummary.teamCaptacao}\n`;
          if (forecastSummary.teamEdicao) csvContent += `  - Edição;${forecastSummary.teamEdicao}\n`;
        }
        if (forecastSummary.custosExtras && forecastSummary.custosExtras !== '0') {
          csvContent += `Custos Extras;${forecastSummary.custosExtras}\n`;
        }
        if (forecastSummary.payable && forecastSummary.payable !== '0') {
          csvContent += `Outros Pagamentos;${forecastSummary.payable}\n`;
        }
        csvContent += '\n';
      }
      
      csvContent += `MOVIMENTOS DO MÊS\n`;
    }

    const headers = type === 'freelancers' 
      ? ['Projeto', 'Colaborador', 'Fase', 'Status', 'Valor']
      : ['Projeto', 'Cliente', 'Vencimento', 'Status', 'Valor'];
    
    const rows = data.map(item => 
      type === 'freelancers'
        ? [item.projeto, item.contraparte, item.fase || '', item.status, item.valor]
        : [item.projeto, item.contraparte, item.vencimento || '', item.status, item.valor]
    );

    csvContent += [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportado com sucesso',
      description: `Ficheiro ${filename}.csv exportado`,
    });
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

    const headers = type === 'freelancers' 
      ? ['Projeto', 'Colaborador', 'Fase', 'Status', 'Valor']
      : ['Projeto', 'Cliente', 'Vencimento', 'Status', 'Valor'];

    const tableRows = data.map(item => {
      if (type === 'freelancers') {
        return `<tr>
          <td>${item.projeto}</td>
          <td>${item.contraparte}</td>
          <td>${item.fase || '-'}</td>
          <td>${item.status}</td>
          <td style="text-align: right">${item.valor}</td>
        </tr>`;
      }
      return `<tr>
        <td>${item.projeto}</td>
        <td>${item.contraparte}</td>
        <td>${item.vencimento || '-'}</td>
        <td>${item.status}</td>
        <td style="text-align: right">${item.valor}</td>
      </tr>`;
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
      : filename;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
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
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
          }
          h1 { 
            color: #111; 
            font-size: 24px;
            font-weight: 700;
          }
          .date { 
            color: #666; 
            font-size: 13px;
          }
          
          /* Forecast Summary Styles */
          .forecast-summary {
            margin-bottom: 30px;
          }
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
          .card-value {
            font-size: 28px;
            font-weight: 700;
          }
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
          .details-table {
            width: 100%;
            border-collapse: collapse;
          }
          .details-table tr {
            border-bottom: 1px solid #e5e7eb;
          }
          .details-table tr:last-child {
            border-bottom: none;
          }
          .details-table td {
            padding: 12px 8px;
          }
          .detail-label {
            font-weight: 500;
          }
          .detail-label.sublabel {
            padding-left: 30px;
            font-weight: 400;
            color: #666;
          }
          .detail-value {
            text-align: right;
            font-weight: 600;
          }
          .subrow td {
            padding: 8px;
          }
          
          /* Table Styles */
          h2 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #374151;
          }
          table { 
            width: 100%; 
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td { 
            padding: 12px 10px; 
            text-align: left; 
            border-bottom: 1px solid #e5e7eb;
          }
          th { 
            background-color: #f3f4f6; 
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #4b5563;
          }
          td {
            font-size: 14px;
          }
          tr:hover {
            background-color: #f9fafb;
          }
          
          .empty-message {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
          }
          
          @media print {
            body { padding: 20px; }
            .forecast-cards { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${title}</h1>
            <p class="date">Exportado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        
        ${forecastSection}
        
        ${data.length > 0 ? `
        <h2>📋 ${type === 'previsao' ? 'Movimentos do Mês' : 'Pagamentos'}</h2>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        ` : type !== 'previsao' ? '<p class="empty-message">Sem movimentos registados</p>' : ''}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }

    toast({
      title: 'PDF gerado',
      description: 'Janela de impressão aberta',
    });
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToCSV}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF}>
        <FileText className="h-4 w-4 mr-2" />
        PDF
      </Button>
    </div>
  );
}
