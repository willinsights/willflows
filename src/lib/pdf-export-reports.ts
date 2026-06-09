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

  const totalReceita = monthlyData.reduce((s, m) => s + m.receita, 0);
  const totalCustos = monthlyData.reduce((s, m) => s + m.custos, 0);
  const totalLucro = monthlyData.reduce((s, m) => s + m.lucro, 0);
  const avgMargin = totalReceita > 0 ? ((totalLucro / totalReceita) * 100) : 0;
  const totalProjetos = monthlyData.reduce((s, m) => s + m.projetos, 0);

  return `<html>
<head>
  <title>Relatório Financeiro - ${workspaceName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
    .header { border-left: 4px solid #8224e3; padding-left: 20px; margin-bottom: 30px; }
    .header h1 { color: #8224e3; font-size: 28px; margin-bottom: 8px; }
    .header .workspace-name { color: #666; font-size: 16px; margin-bottom: 4px; }
    .header .date { color: #999; font-size: 12px; }
    .stats-bar { display: flex; gap: 20px; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f8f4ff 0%, #f0e8ff 100%); border-radius: 12px; flex-wrap: wrap; }
    .stat-item { flex: 1; min-width: 120px; }
    .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; }
    .stat-value.success { color: #16a34a; }
    .stat-value.negative { color: #dc2626; }
    .stat-value.primary { color: #8224e3; }
    h2 { color: #8224e3; margin-top: 30px; margin-bottom: 15px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border: 1px solid #e5e5e5; padding: 10px 8px; text-align: left; }
    th { background: #8224e3; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; }
    th.right, td.right { text-align: right; }
    tr:nth-child(even) { background-color: #fafafa; }
    tr.total { background-color: #f8f4ff; font-weight: bold; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .rankings { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
    .ranking-card { background: #fafafa; border-radius: 12px; padding: 20px; }
    .ranking-card h3 { color: #8224e3; font-size: 14px; margin-bottom: 15px; }
    .ranking-list { list-style: none; }
    .ranking-list li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; font-size: 12px; }
    .ranking-list li:last-child { border-bottom: none; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; }
    .footer-brand { color: #8224e3; font-weight: 600; font-size: 14px; }
    .footer-date { color: #999; font-size: 11px; }
    @media print { body { padding: 20px; } .stats-bar, .rankings { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Relatório Financeiro</h1>
    <p class="workspace-name">${workspaceName}</p>
    <p class="date">Período: ${format(dateRange.start, "d 'de' MMMM 'de' yyyy", { locale: pt })} - ${format(dateRange.end, "d 'de' MMMM 'de' yyyy", { locale: pt })}</p>
  </div>

  <div class="stats-bar">
    <div class="stat-item"><div class="stat-label">Receita Total</div><div class="stat-value success">${formatCurrency(totalReceita)}</div></div>
    <div class="stat-item"><div class="stat-label">Custos Total</div><div class="stat-value negative">${formatCurrency(totalCustos)}</div></div>
    <div class="stat-item"><div class="stat-label">Lucro</div><div class="stat-value primary">${formatCurrency(totalLucro)}</div></div>
    <div class="stat-item"><div class="stat-label">Margem Média</div><div class="stat-value">${avgMargin.toFixed(1)}%</div></div>
    <div class="stat-item"><div class="stat-label">Projetos Entregues</div><div class="stat-value">${totalProjetos}</div></div>
  </div>

  <h2>📈 Evolução Mensal</h2>
  <table>
    <thead><tr><th>Mês</th><th class="right">Receita</th><th class="right">Custos</th><th class="right">Lucro</th><th class="right">Margem</th><th class="right">Projetos</th></tr></thead>
    <tbody>
      ${monthlyData.map(m => `<tr><td>${m.fullMonth}</td><td class="right positive">${formatCurrency(m.receita)}</td><td class="right negative">${formatCurrency(m.custos)}</td><td class="right">${formatCurrency(m.lucro)}</td><td class="right">${m.margin.toFixed(1)}%</td><td class="right">${m.projetos}</td></tr>`).join('')}
      <tr class="total"><td>TOTAL</td><td class="right positive">${formatCurrency(totalReceita)}</td><td class="right negative">${formatCurrency(totalCustos)}</td><td class="right">${formatCurrency(totalLucro)}</td><td class="right">${avgMargin.toFixed(1)}%</td><td class="right">${totalProjetos}</td></tr>
    </tbody>
  </table>

  <div class="rankings">
    <div class="ranking-card">
      <h3>🏆 Top 10 Clientes por Receita</h3>
      <ul class="ranking-list">
        ${topClients.map((c, i) => `<li><span>${i + 1}. ${c.name}</span><span class="positive">${formatCurrency(c.revenue)}</span></li>`).join('')}
        ${topClients.length === 0 ? '<li><span>Sem dados</span></li>' : ''}
      </ul>
    </div>
    <div class="ranking-card">
      <h3>👥 Top 10 Colaboradores</h3>
      <ul class="ranking-list">
        ${collaboratorsData.map((c, i) => `<li><span>${i + 1}. ${c.name}</span><span class="negative">${formatCurrency(c.totalValue)}</span></li>`).join('')}
        ${collaboratorsData.length === 0 ? '<li><span>Sem dados</span></li>' : ''}
      </ul>
    </div>
  </div>

  <div class="footer">
    <span class="footer-brand">WillFlow</span>
    <span class="footer-date">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
  </div>
</body>
</html>`;
}

export function printReportPdf(html: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
