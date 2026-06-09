import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface PdfStatItem {
  label: string;
  value: string;
  className?: 'success' | 'primary' | 'warning' | 'destructive';
}

export interface PdfTableRow {
  cells: (string | { value: string; className?: string })[];
}

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  workspaceName: string;
  statsBar?: PdfStatItem[];
  headers: string[];
  data: PdfTableRow[];
  totalLabel?: string;
  brandColor?: string;
}

/**
 * Generates professional PDF HTML with consistent styling matching "Projetos Finalizados" layout
 * Features:
 * - Purple left border on header
 * - Gradient stats bar
 * - Purple table headers
 * - Zebra-striped rows
 * - WillFlow branded footer
 */
export function generatePdfHtml(options: PdfExportOptions): string {
  const {
    title,
    subtitle,
    workspaceName,
    statsBar,
    headers,
    data,
    totalLabel,
    brandColor = '#8224e3',
  } = options;

  const currentDateTime = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt });

  const statsSection = statsBar && statsBar.length > 0 ? `
    <div class="stats-bar">
      ${statsBar.map(stat => `
        <div class="stat-item">
          <div class="stat-label">${esc(stat.label)}</div>
          <div class="stat-value ${esc(stat.className || '')}">${esc(stat.value)}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const tableRows = data.map((row, index) => {
    const cells = row.cells.map(cell => {
      if (typeof cell === 'string') {
        return `<td>${esc(cell)}</td>`;
      }
      return `<td class="${esc(cell.className || '')}">${esc(cell.value)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <title>${title} - ${workspaceName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; 
          padding: 40px; 
          color: #1a1a1a; 
          background: #fff;
          line-height: 1.5;
        }
        
        /* Header with purple left border */
        .header { 
          border-left: 4px solid ${brandColor}; 
          padding-left: 20px; 
          margin-bottom: 30px; 
        }
        .header h1 { 
          color: ${brandColor}; 
          font-size: 28px; 
          margin-bottom: 8px; 
          font-weight: 700;
        }
        .header .workspace-name { 
          color: #666; 
          font-size: 16px; 
          margin-bottom: 4px;
          font-weight: 500;
        }
        .header .date { 
          color: #999; 
          font-size: 12px; 
        }
        .header .count {
          color: #999;
          font-size: 12px;
          margin-top: 4px;
        }
        
        /* Stats bar with gradient */
        .stats-bar { 
          display: flex; 
          gap: 20px; 
          margin-bottom: 30px; 
          padding: 20px; 
          background: linear-gradient(135deg, #f8f4ff 0%, #f0e8ff 100%); 
          border-radius: 12px; 
          flex-wrap: wrap; 
        }
        .stat-item { 
          flex: 1; 
          min-width: 120px; 
        }
        .stat-label { 
          font-size: 11px; 
          color: #666; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          margin-bottom: 4px; 
        }
        .stat-value { 
          font-size: 22px; 
          font-weight: 700; 
          color: #1a1a1a; 
        }
        .stat-value.success { color: #16a34a; }
        .stat-value.primary { color: ${brandColor}; }
        .stat-value.warning { color: #ca8a04; }
        .stat-value.destructive { color: #dc2626; }
        
        /* Table styles */
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px; 
          font-size: 12px; 
        }
        th, td { 
          border: 1px solid #e5e5e5; 
          padding: 10px 8px; 
          text-align: left; 
        }
        th { 
          background: ${brandColor}; 
          color: white; 
          font-weight: 600; 
          font-size: 11px; 
          text-transform: uppercase; 
        }
        tr:nth-child(even) { background-color: #fafafa; }
        tr:hover { background-color: #f5f0ff; }
        
        /* Value colors */
        .positive, .success { color: #16a34a; font-weight: 600; }
        .negative, .destructive { color: #dc2626; font-weight: 600; }
        .primary { color: ${brandColor}; font-weight: 600; }
        .warning { color: #ca8a04; font-weight: 600; }
        
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
        
        /* Footer */
        .footer { 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #e5e5e5; 
          display: flex; 
          justify-content: space-between;
          align-items: center;
        }
        .footer-brand { 
          color: ${brandColor}; 
          font-weight: 600; 
          font-size: 14px; 
        }
        .footer-date { 
          color: #999; 
          font-size: 11px; 
        }
        
        @media print { 
          body { padding: 20px; } 
          .stats-bar { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        ${subtitle ? `<p class="workspace-name">${subtitle}</p>` : ''}
        <p class="workspace-name">${workspaceName}</p>
        <p class="date">Exportado: ${currentDateTime}</p>
        ${totalLabel ? `<p class="count">${totalLabel}</p>` : ''}
      </div>
      
      ${statsSection}
      
      ${data.length > 0 ? `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      ` : '<p style="text-align: center; padding: 40px; color: #666; font-style: italic;">Sem dados para apresentar</p>'}
      
      <div class="footer">
        <span class="footer-brand">WillFlow</span>
        <span class="footer-date">Gerado em ${currentDateTime}</span>
      </div>
    </body>
    </html>
  `;
}

/**
 * Opens the PDF HTML in a new window for printing
 */
export function printPdf(html: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
  }
}
