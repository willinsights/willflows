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

interface PaymentExportButtonsProps {
  data: ExportData[];
  filename: string;
  type: 'clients' | 'freelancers' | 'invoices';
}

export function PaymentExportButtons({ data, filename, type }: PaymentExportButtonsProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (data.length === 0) {
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
    
    const rows = data.map(item => 
      type === 'freelancers'
        ? [item.projeto, item.contraparte, item.fase || '', item.status, item.valor]
        : [item.projeto, item.contraparte, item.vencimento || '', item.status, item.valor]
    );

    const csvContent = [
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
    if (data.length === 0) {
      toast({
        title: 'Sem dados',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    // Create printable HTML
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .date { color: #666; font-size: 12px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>${filename}</h1>
        <p class="date">Exportado em: ${new Date().toLocaleDateString('pt-PT')}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
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
