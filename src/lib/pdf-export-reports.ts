import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { MonthlyReportData, TopClientData } from '@/hooks/useReportData';
import type { CollaboratorData } from '@/hooks/useCollaboratorRanking';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

interface ReportPdfOptions {
  workspaceName: string;
  dateRange: { start: Date; end: Date };
  monthlyData: MonthlyReportData[];
  topClients: TopClientData[];
  collaboratorsData: CollaboratorData[];
  formatCurrency: (v: number) => string;
}

export function generateReportPdfHtml(opts: ReportPdfOptions): string {
  const { workspaceName, dateRange, monthlyData, topClients, collaboratorsData, formatCurrency } = opts;

  const brand = '#7C3AED';
  const brandDark = '#5B21B6';
  const brandLight = '#A78BFA';

  const totalReceita = monthlyData.reduce((s, m) => s + m.receita, 0);
  const totalCustos = monthlyData.reduce((s, m) => s + m.custos, 0);
  const totalLucro = monthlyData.reduce((s, m) => s + m.lucro, 0);
  const avgMargin = totalReceita > 0 ? ((totalLucro / totalReceita) * 100) : 0;
  const totalProjetos = monthlyData.reduce((s, m) => s + m.projetos, 0);
  const emittedAt = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt });
  const periodLabel = `${format(dateRange.start, "d 'de' MMM yyyy", { locale: pt })} — ${format(dateRange.end, "d 'de' MMM yyyy", { locale: pt })}`;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Relatório de Lucro — ${esc(workspaceName)}</title>
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
      color: #0f172a; background: #f1f5f9; font-size: 10pt; line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    body { padding: 20px; }
    .page {
      width: 269mm; max-width: 100%; min-height: 190mm;
      margin: 0 auto; background: #fff; padding: 12mm 10mm;
    }
    @media print { body { background: #fff; padding: 0; } .page { width: 100%; padding: 0; box-shadow: none; } }

    .brand-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
      background: linear-gradient(135deg, ${brandDark} 0%, ${brand} 55%, ${brandLight} 100%);
      color: #fff; padding: 22px 26px; border-radius: 14px; margin-bottom: 22px;
    }
    .brand-mark { display: flex; align-items: center; gap: 12px; }
    .logo {
      width: 42px; height: 42px; border-radius: 12px;
      background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px;
    }
    .brand-name { font-size: 11pt; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; opacity: 0.9; }
    .brand-tag { font-size: 8.5pt; opacity: 0.75; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 8.5pt; opacity: 0.9; }
    .doc-meta strong { display: block; font-size: 9pt; font-weight: 600; margin-bottom: 2px; }

    .title-block {
      padding: 4px 4px 18px 4px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;
    }
    .title-block h1 { font-size: 20pt; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 6px; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 18px; font-size: 9pt; color: #475569; }
    .meta-row span strong { color: #0f172a; font-weight: 600; }

    .stats-bar {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 22px;
    }
    .stat-item {
      padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
      border-left: 3px solid ${brand};
    }
    .stat-item.success { border-left-color: #16a34a; }
    .stat-item.destructive { border-left-color: #dc2626; }
    .stat-label {
      font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;
      font-weight: 600; margin-bottom: 4px;
    }
    .stat-value { font-size: 14pt; font-weight: 700; font-variant-numeric: tabular-nums; }
    .stat-item.success .stat-value { color: #15803d; }
    .stat-item.destructive .stat-value { color: #b91c1c; }
    .stat-item.primary .stat-value { color: ${brandDark}; }

    h2 {
      color: ${brandDark}; font-size: 12pt; font-weight: 700;
      margin: 24px 0 10px; letter-spacing: -0.2px;
    }

    table {
      width: 100%; border-collapse: separate; border-spacing: 0; font-size: 9pt;
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    thead th {
      background: ${brandDark}; color: #fff; font-weight: 600; font-size: 8.5pt;
      text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left;
      border-bottom: 2px solid ${brand};
    }
    thead th.right { text-align: right; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tbody tr:nth-child(even) td { background: #fafaff; }
    td.right { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .positive { color: #15803d; font-weight: 600; }
    .negative { color: #b91c1c; font-weight: 600; }

    tr.total td {
      background: linear-gradient(90deg, rgba(124,58,237,0.06), rgba(124,58,237,0.12));
      font-weight: 700; color: ${brandDark};
      border-top: 2px solid ${brand}; border-bottom: none;
      text-transform: uppercase; letter-spacing: 0.4px; font-size: 9pt;
    }

    .rankings { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 8px; }
    .ranking-card {
      background: #fafaff; border: 1px solid #e9e5ff; border-radius: 12px; padding: 16px 18px;
    }
    .ranking-card h3 {
      font-size: 10pt; color: ${brandDark}; font-weight: 700; margin-bottom: 10px;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .ranking-list { list-style: none; }
    .ranking-list li {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #ece7ff; font-size: 9pt;
    }
    .ranking-list li:last-child { border-bottom: none; }
    .ranking-list .rank { color: ${brand}; font-weight: 700; margin-right: 6px; }
    .ranking-list .amount { font-variant-numeric: tabular-nums; font-weight: 600; }

    .doc-footer {
      margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8pt; color: #94a3b8;
    }
    .doc-footer .brand { color: ${brandDark}; font-weight: 700; letter-spacing: 0.5px; }

    @media print {
      thead { display: table-header-group; }
      tr, .stat-item, .ranking-card { page-break-inside: avoid; }
      .brand-header, thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">
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
      Emitido em ${emittedAt}
    </div>
  </header>

  <div class="title-block">
    <h1>Relatório de Lucro</h1>
    <div class="meta-row">
      <span><strong>Workspace:</strong> ${esc(workspaceName)}</span>
      <span><strong>Período:</strong> ${periodLabel}</span>
    </div>
  </div>

  <section class="stats-bar">
    <div class="stat-item success"><div class="stat-label">Receita Total</div><div class="stat-value">${formatCurrency(totalReceita)}</div></div>
    <div class="stat-item destructive"><div class="stat-label">Custos Totais</div><div class="stat-value">${formatCurrency(totalCustos)}</div></div>
    <div class="stat-item primary"><div class="stat-label">Lucro Líquido</div><div class="stat-value">${formatCurrency(totalLucro)}</div></div>
    <div class="stat-item"><div class="stat-label">Margem Média</div><div class="stat-value">${avgMargin.toFixed(1)}%</div></div>
    <div class="stat-item"><div class="stat-label">Projetos Entregues</div><div class="stat-value">${totalProjetos}</div></div>
  </section>

  <h2>Evolução Mensal</h2>
  <table>
    <thead><tr>
      <th>Mês</th>
      <th class="right">Receita</th>
      <th class="right">Custos</th>
      <th class="right">Lucro</th>
      <th class="right">Margem</th>
      <th class="right">Projetos</th>
    </tr></thead>
    <tbody>
      ${monthlyData.map(m => `<tr>
        <td>${esc(m.fullMonth)}</td>
        <td class="right positive">${formatCurrency(m.receita)}</td>
        <td class="right negative">${formatCurrency(m.custos)}</td>
        <td class="right">${formatCurrency(m.lucro)}</td>
        <td class="right">${m.margin.toFixed(1)}%</td>
        <td class="right">${m.projetos}</td>
      </tr>`).join('')}
      <tr class="total">
        <td>Total</td>
        <td class="right">${formatCurrency(totalReceita)}</td>
        <td class="right">${formatCurrency(totalCustos)}</td>
        <td class="right">${formatCurrency(totalLucro)}</td>
        <td class="right">${avgMargin.toFixed(1)}%</td>
        <td class="right">${totalProjetos}</td>
      </tr>
    </tbody>
  </table>

  <div class="rankings">
    <div class="ranking-card">
      <h3>Top 10 Clientes por Receita</h3>
      <ul class="ranking-list">
        ${topClients.map((c, i) => `<li><span><span class="rank">${i + 1}.</span>${esc(c.name)}</span><span class="amount positive">${formatCurrency(c.revenue)}</span></li>`).join('')}
        ${topClients.length === 0 ? '<li><span>Sem dados</span></li>' : ''}
      </ul>
    </div>
    <div class="ranking-card">
      <h3>Top 10 Colaboradores</h3>
      <ul class="ranking-list">
        ${collaboratorsData.map((c, i) => `<li><span><span class="rank">${i + 1}.</span>${esc(c.name)}</span><span class="amount negative">${formatCurrency(c.totalValue)}</span></li>`).join('')}
        ${collaboratorsData.length === 0 ? '<li><span>Sem dados</span></li>' : ''}
      </ul>
    </div>
  </div>

  <div class="doc-footer">
    <span>Gerado por <span class="brand">WillFlow</span> · ${emittedAt}</span>
    <span>Documento interno · confidencial</span>
  </div>
</div>
</body>
</html>`;
}

export function printReportPdf(html: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => setTimeout(() => printWindow.print(), 300);
  }
}
