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
  clientName?: string;
  periodLabel?: string;
  statsBar?: PdfStatItem[];
  headers: string[];
  data: PdfTableRow[];
  totalLabel?: string;
  totalsRow?: { label: string; value: string; className?: 'success' | 'primary' | 'destructive' };
  disclaimer?: string;
  brandColor?: string;
}

/**
 * Detects columns whose values look like currency / numeric and should be right-aligned.
 */
function detectNumericColumns(headers: string[], data: PdfTableRow[]): boolean[] {
  const numRe = /^[\s+\-−–]*(?:€\s*)?[\d.,]+\s*€?\s*$/;
  return headers.map((h, i) => {
    const label = h.toLowerCase();
    if (/(valor|preço|preco|custo|total|receita|lucro|saldo|montante|iva|€|pago|pendente)/.test(label)) {
      // still verify a majority of rows look numeric
      let numeric = 0, filled = 0;
      for (const r of data) {
        const c = r.cells[i];
        const raw = typeof c === 'string' ? c : c?.value ?? '';
        if (!raw || raw === '-') continue;
        filled++;
        // strip HTML tags for detection
        const plain = raw.replace(/<[^>]*>/g, '').trim();
        if (numRe.test(plain)) numeric++;
      }
      return filled === 0 || numeric / filled >= 0.5;
    }
    return false;
  });
}

/**
 * Generates a premium, WillFlow-branded PDF report (A4, print-ready).
 */
export function generatePdfHtml(options: PdfExportOptions): string {
  const {
    title,
    subtitle,
    workspaceName,
    clientName,
    periodLabel,
    statsBar,
    headers,
    data,
    totalLabel,
    totalsRow,
    disclaimer,
    brandColor = '#7C3AED',
  } = options;

  const brandDark = '#5B21B6';
  const brandLight = '#A78BFA';
  const currentDateTime = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt });
  const numericCols = detectNumericColumns(headers, data);

  const statsSection = statsBar && statsBar.length > 0 ? `
    <section class="stats-bar">
      ${statsBar.map(stat => `
        <div class="stat-item ${esc(stat.className || '')}">
          <div class="stat-label">${esc(stat.label)}</div>
          <div class="stat-value">${esc(stat.value)}</div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const tableRows = data.map((row) => {
    const cells = row.cells.map((cell, ci) => {
      const isNum = numericCols[ci];
      if (typeof cell === 'string') {
        return `<td class="${isNum ? 'num' : ''}">${esc(cell)}</td>`;
      }
      return `<td class="${esc(cell.className || '')} ${isNum ? 'num' : ''}">${esc(cell.value)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const totalsRowHtml = totalsRow ? `
    <tr class="totals-row">
      <td colspan="${headers.length - 1}">${esc(totalsRow.label)}</td>
      <td class="num ${esc(totalsRow.className || 'primary')}">${esc(totalsRow.value)}</td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>${esc(title)} — ${esc(workspaceName)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 18mm 14mm 20mm 14mm;
      @bottom-left { content: "WillFlow · ${esc(workspaceName)}"; font-family: 'Inter', sans-serif; font-size: 8pt; color: #94a3b8; }
      @bottom-right { content: "Página " counter(page) " de " counter(pages); font-family: 'Inter', sans-serif; font-size: 8pt; color: #94a3b8; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      font-size: 10pt;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    body { padding: 20px; }
    .page {
      width: 269mm; max-width: 100%; min-height: 190mm;
      margin: 0 auto; background: #fff; padding: 12mm 10mm;
      box-shadow: 0 2px 12px rgba(15,23,42,0.08);
    }
    @media screen and (max-width: 900px) { .page { width: 100%; padding: 16px; } }
    @media print { body { background: #fff; padding: 0; } .page { width: 100%; padding: 0; box-shadow: none; min-height: 0; } }


    /* ---- Brand header ---- */
    .brand-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      background: linear-gradient(135deg, ${brandDark} 0%, ${brandColor} 55%, ${brandLight} 100%);
      color: #fff;
      padding: 22px 26px;
      border-radius: 14px;
      margin-bottom: 22px;
      box-shadow: 0 2px 0 rgba(15, 23, 42, 0.04);
    }
    .brand-header .brand-mark {
      display: flex; align-items: center; gap: 12px;
    }
    .brand-header .logo {
      width: 42px; height: 42px;
      border-radius: 12px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px; letter-spacing: -0.5px;
    }
    .brand-header .brand-name {
      font-size: 11pt; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; opacity: 0.9;
    }
    .brand-header .brand-tag { font-size: 8.5pt; opacity: 0.75; margin-top: 2px; }
    .brand-header .doc-meta { text-align: right; font-size: 8.5pt; opacity: 0.9; }
    .brand-header .doc-meta strong { display: block; font-size: 9pt; font-weight: 600; margin-bottom: 2px; }

    /* ---- Title block ---- */
    .title-block {
      padding: 4px 4px 18px 4px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 20px;
    }
    .title-block h1 {
      font-size: 20pt; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 6px;
    }
    .title-block .meta-row {
      display: flex; flex-wrap: wrap; gap: 18px; font-size: 9pt; color: #475569;
    }
    .title-block .meta-row span strong { color: #0f172a; font-weight: 600; }

    /* ---- Stats bar ---- */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 22px;
    }
    .stat-item {
      padding: 14px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      border-left: 3px solid ${brandColor};
    }
    .stat-item.success { border-left-color: #16a34a; }
    .stat-item.destructive { border-left-color: #dc2626; }
    .stat-item.warning { border-left-color: #d97706; }
    .stat-item.primary { border-left-color: ${brandColor}; }
    .stat-label {
      font-size: 8pt; color: #64748b; text-transform: uppercase;
      letter-spacing: 0.6px; font-weight: 600; margin-bottom: 4px;
    }
    .stat-value {
      font-size: 15pt; font-weight: 700; color: #0f172a;
      font-variant-numeric: tabular-nums;
    }
    .stat-item.success .stat-value { color: #15803d; }
    .stat-item.destructive .stat-value { color: #b91c1c; }
    .stat-item.warning .stat-value { color: #b45309; }
    .stat-item.primary .stat-value { color: ${brandDark}; }

    /* ---- Table ---- */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 9pt;
      margin-top: 4px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    thead th {
      background: ${brandDark};
      color: #fff;
      font-weight: 600;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 2px solid ${brandColor};
    }
    thead th.num { text-align: right; }
    tbody td {
      padding: 9px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #fafaff; }
    tbody tr:last-child td { border-bottom: none; }
    td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum';
      white-space: nowrap;
    }
    .positive, .success { color: #15803d; font-weight: 600; }
    .negative, .destructive { color: #b91c1c; font-weight: 600; }
    .primary { color: ${brandDark}; font-weight: 600; }
    .warning { color: #b45309; font-weight: 600; }

    /* Status badges */
    .status-badge {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 999px;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      background: #f1f5f9; color: #475569;
    }
    .status-pago { background: #dcfce7; color: #15803d; }
    .status-pendente { background: #fef9c3; color: #a16207; }
    .status-vencido { background: #fee2e2; color: #b91c1c; }
    .status-cancelado { background: #f1f5f9; color: #64748b; }

    /* Totals row */
    tr.totals-row td {
      background: linear-gradient(90deg, rgba(124,58,237,0.06), rgba(124,58,237,0.12));
      font-weight: 700;
      font-size: 10pt;
      color: #0f172a;
      border-top: 2px solid ${brandColor};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    tr.totals-row td.num { font-size: 12pt; color: ${brandDark}; }

    .empty-state {
      text-align: center; padding: 60px 20px;
      color: #94a3b8; font-style: italic;
      border: 1px dashed #e2e8f0; border-radius: 10px;
    }

    .disclaimer {
      margin-top: 22px;
      padding: 12px 14px;
      background: #fafaff;
      border-left: 3px solid ${brandLight};
      border-radius: 6px;
      font-size: 8pt;
      color: #64748b;
      line-height: 1.5;
    }

    .doc-footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8pt; color: #94a3b8;
    }
    .doc-footer .brand { color: ${brandDark}; font-weight: 700; letter-spacing: 0.5px; }

    @media print {
      thead { display: table-header-group; }
      tr, .stat-item { page-break-inside: avoid; }
      .brand-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header class="brand-header">
    <div class="brand-mark">
      <div class="logo">W</div>
      <div>
        <div class="brand-name">WillFlow</div>
        <div class="brand-tag">Gestão financeira para estúdios criativos</div>
      </div>
    </div>
    <div class="doc-meta">
      <strong>${esc(workspaceName)}</strong>
      Emitido em ${currentDateTime}
    </div>
  </header>

  <div class="title-block">
    <h1>${esc(title)}</h1>
    <div class="meta-row">
      ${subtitle ? `<span>${esc(subtitle)}</span>` : ''}
      ${clientName ? `<span><strong>Cliente:</strong> ${esc(clientName)}</span>` : ''}
      ${periodLabel ? `<span><strong>Período:</strong> ${esc(periodLabel)}</span>` : ''}
      ${totalLabel ? `<span>${esc(totalLabel)}</span>` : ''}
    </div>
  </div>

  ${statsSection}

  ${data.length > 0 ? `
  <table>
    <thead>
      <tr>${headers.map((h, i) => `<th class="${numericCols[i] ? 'num' : ''}">${esc(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>${tableRows}${totalsRowHtml}</tbody>
  </table>
  ` : '<div class="empty-state">Sem dados para apresentar neste período</div>'}

  ${disclaimer ? `<div class="disclaimer">${esc(disclaimer)}</div>` : ''}

  <div class="doc-footer">
    <span>Gerado por <span class="brand">WillFlow</span> · ${currentDateTime}</span>
    <span>Documento interno · confidencial</span>
  </div>
</body>
</html>`;
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
