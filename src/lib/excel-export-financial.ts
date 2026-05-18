// exceljs (~600KB) is loaded lazily inside each exported function via dynamic import.
import type * as ExcelJS from 'exceljs';
let _ExcelJS: typeof ExcelJS | undefined;
async function loadExcelJS(): Promise<typeof ExcelJS> {
  if (!_ExcelJS) _ExcelJS = await import('exceljs');
  return _ExcelJS;
}
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface MonthlyRow {
  month: string;
  fullMonth: string;
  receita: number;
  custos: number;
  lucro: number;
  margin: number;
  projetos: number;
}

interface ClientRow {
  name: string;
  revenue: number;
  projects: number;
}

interface CollaboratorRow {
  name: string;
  totalValue: number;
  projectCount: number;
  isExternal: boolean;
}

interface CostCategoryRow {
  category: string;
  estimated: number;
  actual: number;
  variance: number;
}

interface SummaryMetrics {
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  margin: number;
  avgProjectValue: number;
  totalProjects: number;
  deliveredProjects: number;
  activeClients: number;
}

export interface FinancialExcelExportOptions {
  workspaceName: string;
  dateRange: { start: Date; end: Date };
  monthlyData: MonthlyRow[];
  topClients: ClientRow[];
  collaborators: CollaboratorRow[];
  costBreakdown?: CostCategoryRow[];
  summary: SummaryMetrics;
  brandColor?: string;
}

const BRAND = '8224E3';
const BRAND_LIGHT = 'F3EAFF';
const WHITE = 'FFFFFF';
const GRAY = '666666';
const GRAY_LIGHT = '999999';
const SUCCESS = '22C55E';
const DESTRUCTIVE = 'EF4444';

function applyHeaderStyle(row: ExcelJS.Row, color: string) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: color } } };
  });
  row.height = 28;
}

function applyDataRow(row: ExcelJS.Row, index: number) {
  if (index % 2 === 1) {
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT } };
    });
  }
  row.height = 22;
}

function currencyFormat(currency: string) {
  return currency === 'EUR' ? '#,##0.00 €' : '$#,##0.00';
}

function addTitle(ws: ExcelJS.Worksheet, title: string, subtitle: string, colCount: number) {
  const titleRow = ws.addRow([title]);
  titleRow.font = { bold: true, size: 16, color: { argb: BRAND } };
  ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);

  const subRow = ws.addRow([subtitle]);
  subRow.font = { size: 11, color: { argb: GRAY } };
  ws.mergeCells(subRow.number, 1, subRow.number, colCount);

  const dateRow = ws.addRow([`Exportado: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`]);
  dateRow.font = { size: 9, color: { argb: GRAY_LIGHT } };

  ws.addRow([]);
}

export async function exportFinancialExcel(options: FinancialExcelExportOptions): Promise<void> {
  const ExcelJSLib = await loadExcelJS();
  const wb = new ExcelJSLib.Workbook();
  wb.creator = 'WillFlow';
  wb.created = new Date();
  const fmt = currencyFormat('EUR');
  const periodLabel = `${format(options.dateRange.start, "d MMM yyyy", { locale: pt })} – ${format(options.dateRange.end, "d MMM yyyy", { locale: pt })}`;

  // ── Sheet 1: Resumo ──
  const ws1 = wb.addWorksheet('Resumo', { properties: { tabColor: { argb: BRAND } } });
  addTitle(ws1, 'Relatório Financeiro', `${options.workspaceName} • ${periodLabel}`, 4);

  const kpis: [string, number | string][] = [
    ['Receita Total', options.summary.totalRevenue],
    ['Custos Totais', options.summary.totalCosts],
    ['Lucro', options.summary.profit],
    ['Margem de Lucro', `${options.summary.margin.toFixed(1)}%`],
    ['Valor Médio/Projeto', options.summary.avgProjectValue],
    ['Total Projetos', options.summary.totalProjects],
    ['Projetos Entregues', options.summary.deliveredProjects],
    ['Clientes Ativos', options.summary.activeClients],
  ];

  const kpiHeader = ws1.addRow(['Indicador', 'Valor']);
  applyHeaderStyle(kpiHeader, BRAND);
  kpis.forEach(([label, value], i) => {
    const row = ws1.addRow([label, value]);
    if (typeof value === 'number' && !Number.isInteger(value)) {
      row.getCell(2).numFmt = fmt;
    }
    row.getCell(1).font = { bold: true, size: 11 };
    row.getCell(2).font = { size: 12, bold: true, color: { argb: i === 0 ? SUCCESS : i === 1 ? DESTRUCTIVE : BRAND } };
    applyDataRow(row, i);
  });

  ws1.getColumn(1).width = 24;
  ws1.getColumn(2).width = 20;

  // ── Sheet 2: Evolução Mensal ──
  const ws2 = wb.addWorksheet('Evolução Mensal', { properties: { tabColor: { argb: SUCCESS } } });
  addTitle(ws2, 'Evolução Financeira Mensal', periodLabel, 6);

  const mHeaders = ['Mês', 'Receita', 'Custos', 'Lucro', 'Margem (%)', 'Projetos'];
  applyHeaderStyle(ws2.addRow(mHeaders), BRAND);

  options.monthlyData.forEach((m, i) => {
    const row = ws2.addRow([m.fullMonth, m.receita, m.custos, m.lucro, m.margin / 100, m.projetos]);
    row.getCell(2).numFmt = fmt;
    row.getCell(3).numFmt = fmt;
    row.getCell(4).numFmt = fmt;
    row.getCell(5).numFmt = '0.0%';
    applyDataRow(row, i);
  });

  // Totals row
  const dataStart = 6; // header row number (title takes 4 rows + 1 empty + 1 header)
  const dataEnd = dataStart + options.monthlyData.length - 1;
  const totalRow = ws2.addRow([
    'TOTAL',
    { formula: `SUM(B${dataStart}:B${dataEnd})` },
    { formula: `SUM(C${dataStart}:C${dataEnd})` },
    { formula: `SUM(D${dataStart}:D${dataEnd})` },
    { formula: `IF(B${dataEnd + 1}=0,0,D${dataEnd + 1}/B${dataEnd + 1})` },
    { formula: `SUM(F${dataStart}:F${dataEnd})` },
  ]);
  totalRow.font = { bold: true, size: 11 };
  totalRow.getCell(2).numFmt = fmt;
  totalRow.getCell(3).numFmt = fmt;
  totalRow.getCell(4).numFmt = fmt;
  totalRow.getCell(5).numFmt = '0.0%';
  totalRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT } };
    cell.border = { top: { style: 'double', color: { argb: BRAND } } };
  });

  [18, 16, 16, 16, 12, 12].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

  // ── Sheet 3: Top Clientes ──
  const ws3 = wb.addWorksheet('Clientes', { properties: { tabColor: { argb: '22C55E' } } });
  addTitle(ws3, 'Top Clientes por Receita', periodLabel, 4);

  applyHeaderStyle(ws3.addRow(['#', 'Cliente', 'Receita', 'Projetos']), BRAND);
  options.topClients.forEach((c, i) => {
    const row = ws3.addRow([i + 1, c.name, c.revenue, c.projects]);
    row.getCell(3).numFmt = fmt;
    applyDataRow(row, i);
  });

  ws3.getColumn(1).width = 6;
  ws3.getColumn(2).width = 30;
  ws3.getColumn(3).width = 18;
  ws3.getColumn(4).width = 12;

  // ── Sheet 4: Colaboradores ──
  const ws4 = wb.addWorksheet('Colaboradores', { properties: { tabColor: { argb: BRAND } } });
  addTitle(ws4, 'Top Colaboradores', periodLabel, 4);

  applyHeaderStyle(ws4.addRow(['#', 'Colaborador', 'Total Ganho', 'Projetos', 'Tipo']), BRAND);
  options.collaborators.forEach((c, i) => {
    const row = ws4.addRow([i + 1, c.name, c.totalValue, c.projectCount, c.isExternal ? 'Externo' : 'Interno']);
    row.getCell(3).numFmt = fmt;
    applyDataRow(row, i);
  });

  ws4.getColumn(1).width = 6;
  ws4.getColumn(2).width = 28;
  ws4.getColumn(3).width = 18;
  ws4.getColumn(4).width = 12;
  ws4.getColumn(5).width = 12;

  // ── Sheet 5: Custos por Categoria (if available) ──
  if (options.costBreakdown && options.costBreakdown.length > 0) {
    const ws5 = wb.addWorksheet('Custos por Categoria', { properties: { tabColor: { argb: DESTRUCTIVE } } });
    addTitle(ws5, 'Custos por Categoria', 'Estimado vs Real', 4);

    applyHeaderStyle(ws5.addRow(['Categoria', 'Estimado', 'Real', 'Variação']), BRAND);
    options.costBreakdown.forEach((c, i) => {
      const row = ws5.addRow([c.category, c.estimated, c.actual, c.variance]);
      row.getCell(2).numFmt = fmt;
      row.getCell(3).numFmt = fmt;
      row.getCell(4).numFmt = fmt;
      // Color variance
      if (c.variance > 0) row.getCell(4).font = { color: { argb: DESTRUCTIVE } };
      else if (c.variance < 0) row.getCell(4).font = { color: { argb: SUCCESS } };
      applyDataRow(row, i);
    });

    ws5.getColumn(1).width = 20;
    ws5.getColumn(2).width = 16;
    ws5.getColumn(3).width = 16;
    ws5.getColumn(4).width = 16;
  }

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
