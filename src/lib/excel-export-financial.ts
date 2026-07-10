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

// WillFlow brand palette (ARGB, no leading #)
const BRAND = {
  primary: 'FF7C3AED',
  primaryDark: 'FF5B21B6',
  primaryLight: 'FFA78BFA',
  bandBg: 'FFF5F3FF',
  headerText: 'FFFFFFFF',
  zebra: 'FFFAFAFF',
  border: 'FFE2E8F0',
  ink: 'FF0F172A',
  mute: 'FF64748B',
  success: 'FF15803D',
  danger: 'FFB91C1C',
  totalsBg: 'FFEDE9FE',
};

const EUR_FMT = '#,##0.00\\ "€";[Red]-#,##0.00\\ "€";"—"';

function colLetter(n: number): string {
  let s = ''; let x = n;
  while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); }
  return s;
}

function applyBrandHeader(
  ws: ExcelJS.Worksheet,
  opts: { title: string; workspaceName: string; periodLabel: string; colCount: number },
) {
  const cols = Math.max(1, opts.colCount);
  const L = colLetter(cols);

  // Row 1 — brand band
  const brandRow = ws.addRow(['WillFlow']);
  ws.mergeCells(`A1:${L}1`);
  brandRow.height = 34;
  brandRow.getCell(1).value = 'WillFlow';
  brandRow.getCell(1).font = { name: 'Calibri', bold: true, size: 18, color: { argb: BRAND.headerText } };
  brandRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  brandRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primary } };

  // Row 2 — doc title
  const titleRow = ws.addRow([opts.title]);
  ws.mergeCells(`A2:${L}2`);
  titleRow.height = 26;
  titleRow.getCell(1).font = { name: 'Calibri', bold: true, size: 15, color: { argb: BRAND.ink } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 3 — meta
  const meta = [
    opts.workspaceName,
    `Período: ${opts.periodLabel}`,
    `Emitido: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`,
  ].join('   ·   ');
  const metaRow = ws.addRow([meta]);
  ws.mergeCells(`A3:${L}3`);
  metaRow.height = 18;
  metaRow.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: BRAND.mute } };
  metaRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 4 — thin band
  const spacer = ws.addRow(['']);
  ws.mergeCells(`A4:${L}4`);
  spacer.height = 6;
  spacer.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.bandBg } };

  ws.addRow([]); // Row 5 spacer
}

function styleHeaderRow(row: ExcelJS.Row, numericFlags: boolean[]) {
  row.height = 22;
  row.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', bold: true, size: 10.5, color: { argb: BRAND.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primaryDark } };
    cell.alignment = { horizontal: numericFlags[colNumber - 1] ? 'right' : 'left', vertical: 'middle', indent: 1 };
    cell.border = {
      top: { style: 'thin', color: { argb: BRAND.primary } },
      bottom: { style: 'medium', color: { argb: BRAND.primary } },
    };
  });
}

function styleDataRow(row: ExcelJS.Row, index: number, numericFlags: boolean[]) {
  const zebra = index % 2 === 1;
  row.eachCell((cell, colNumber) => {
    const isNum = numericFlags[colNumber - 1];
    cell.font = { name: 'Calibri', size: 10, color: { argb: BRAND.ink } };
    cell.alignment = { horizontal: isNum ? 'right' : 'left', vertical: 'middle', indent: 1 };
    cell.border = { bottom: { style: 'hair', color: { argb: BRAND.border } } };
    if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.zebra } };
  });
  row.height = 20;
}

function sectionTitle(ws: ExcelJS.Worksheet, title: string, colCount: number) {
  ws.addRow([]);
  const row = ws.addRow([title]);
  ws.mergeCells(`A${row.number}:${colLetter(Math.max(1, colCount))}${row.number}`);
  row.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: BRAND.primaryDark } };
  row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  row.height = 20;
}

function configurePage(ws: ExcelJS.Worksheet) {
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
    horizontalCentered: true,
  };
  ws.headerFooter = {
    oddFooter: '&L&"Calibri,Regular"&8&K7C3AEDWillFlow&K000000 · Documento gerado automaticamente&C&"Calibri,Regular"&8Página &P de &N&R&"Calibri,Regular"&8' + format(new Date(), 'dd/MM/yyyy HH:mm'),
  };
}

export async function exportFinancialExcel(options: FinancialExcelExportOptions): Promise<void> {
  const ExcelJSLib = await loadExcelJS();
  const wb = new ExcelJSLib.Workbook();
  wb.creator = 'WillFlow';
  wb.company = 'WillFlow';
  wb.created = new Date();

  const periodLabel = `${format(options.dateRange.start, "d MMM yyyy", { locale: pt })} — ${format(options.dateRange.end, "d MMM yyyy", { locale: pt })}`;

  // ── Sheet 1: Resumo ──
  const ws1 = wb.addWorksheet('Resumo', {
    properties: { tabColor: { argb: BRAND.primary } },
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
  });
  applyBrandHeader(ws1, { title: 'Relatório Financeiro — Resumo', workspaceName: options.workspaceName, periodLabel, colCount: 2 });

  const kpiHeader = ws1.addRow(['Indicador', 'Valor']);
  styleHeaderRow(kpiHeader, [false, true]);

  const kpis: [string, number | string, boolean][] = [
    ['Receita Total', options.summary.totalRevenue, true],
    ['Custos Totais', options.summary.totalCosts, true],
    ['Lucro Líquido', options.summary.profit, true],
    ['Margem de Lucro', `${options.summary.margin.toFixed(1)}%`, false],
    ['Valor Médio por Projeto', options.summary.avgProjectValue, true],
    ['Total de Projetos', options.summary.totalProjects, false],
    ['Projetos Entregues', options.summary.deliveredProjects, false],
    ['Clientes Ativos', options.summary.activeClients, false],
  ];
  kpis.forEach(([label, value, isCurrency], i) => {
    const row = ws1.addRow([label, value]);
    styleDataRow(row, i, [false, true]);
    row.getCell(1).font = { name: 'Calibri', bold: true, size: 10.5, color: { argb: BRAND.ink } };
    if (isCurrency && typeof value === 'number') {
      row.getCell(2).numFmt = EUR_FMT;
    }
    row.getCell(2).font = { name: 'Calibri', bold: true, size: 11, color: { argb: BRAND.primaryDark } };
  });
  ws1.getColumn(1).width = 32;
  ws1.getColumn(2).width = 24;
  configurePage(ws1);

  // ── Sheet 2: Evolução Mensal ──
  const ws2 = wb.addWorksheet('Evolução Mensal', {
    properties: { tabColor: { argb: BRAND.success } },
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
  });
  applyBrandHeader(ws2, { title: 'Evolução Financeira Mensal', workspaceName: options.workspaceName, periodLabel, colCount: 6 });

  const mNumFlags = [false, true, true, true, true, false];
  const mHeader = ws2.addRow(['Mês', 'Receita', 'Custos', 'Lucro', 'Margem', 'Projetos']);
  styleHeaderRow(mHeader, mNumFlags);

  const dataStart = mHeader.number + 1;
  options.monthlyData.forEach((m, i) => {
    const row = ws2.addRow([m.fullMonth, m.receita, m.custos, m.lucro, m.margin / 100, m.projetos]);
    styleDataRow(row, i, mNumFlags);
    row.getCell(2).numFmt = EUR_FMT;
    row.getCell(3).numFmt = EUR_FMT;
    row.getCell(4).numFmt = EUR_FMT;
    row.getCell(5).numFmt = '0.0%';
    row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: BRAND.success } };
    row.getCell(3).font = { name: 'Calibri', size: 10, color: { argb: BRAND.danger } };
  });
  const dataEnd = dataStart + options.monthlyData.length - 1;

  // Totals row
  if (options.monthlyData.length > 0) {
    const totalRow = ws2.addRow([
      'TOTAL',
      { formula: `SUM(B${dataStart}:B${dataEnd})` },
      { formula: `SUM(C${dataStart}:C${dataEnd})` },
      { formula: `SUM(D${dataStart}:D${dataEnd})` },
      { formula: `IF(B${dataEnd + 1}=0,0,D${dataEnd + 1}/B${dataEnd + 1})` },
      { formula: `SUM(F${dataStart}:F${dataEnd})` },
    ]);
    totalRow.height = 22;
    totalRow.eachCell((cell, colNumber) => {
      const isNum = mNumFlags[colNumber - 1];
      cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: BRAND.primaryDark } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.totalsBg } };
      cell.alignment = { horizontal: isNum ? 'right' : 'left', vertical: 'middle', indent: 1 };
      cell.border = {
        top: { style: 'medium', color: { argb: BRAND.primary } },
        bottom: { style: 'medium', color: { argb: BRAND.primary } },
      };
    });
    totalRow.getCell(2).numFmt = EUR_FMT;
    totalRow.getCell(3).numFmt = EUR_FMT;
    totalRow.getCell(4).numFmt = EUR_FMT;
    totalRow.getCell(5).numFmt = '0.0%';
  }

  [22, 16, 16, 16, 12, 12].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });
  configurePage(ws2);

  // ── Sheet 3: Top Clientes ──
  const ws3 = wb.addWorksheet('Top Clientes', {
    properties: { tabColor: { argb: BRAND.success } },
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
  });
  applyBrandHeader(ws3, { title: 'Top Clientes por Receita', workspaceName: options.workspaceName, periodLabel, colCount: 4 });

  const cNumFlags = [false, false, true, false];
  styleHeaderRow(ws3.addRow(['#', 'Cliente', 'Receita', 'Projetos']), cNumFlags);
  options.topClients.forEach((c, i) => {
    const row = ws3.addRow([i + 1, c.name, c.revenue, c.projects]);
    styleDataRow(row, i, cNumFlags);
    row.getCell(3).numFmt = EUR_FMT;
    row.getCell(3).font = { name: 'Calibri', bold: true, size: 10, color: { argb: BRAND.success } };
  });
  [6, 34, 20, 12].forEach((w, i) => { ws3.getColumn(i + 1).width = w; });
  configurePage(ws3);

  // ── Sheet 4: Colaboradores ──
  const ws4 = wb.addWorksheet('Colaboradores', {
    properties: { tabColor: { argb: BRAND.primary } },
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
  });
  applyBrandHeader(ws4, { title: 'Top Colaboradores', workspaceName: options.workspaceName, periodLabel, colCount: 5 });

  const kNumFlags = [false, false, true, false, false];
  styleHeaderRow(ws4.addRow(['#', 'Colaborador', 'Total Ganho', 'Projetos', 'Tipo']), kNumFlags);
  options.collaborators.forEach((c, i) => {
    const row = ws4.addRow([i + 1, c.name, c.totalValue, c.projectCount, c.isExternal ? 'Externo' : 'Interno']);
    styleDataRow(row, i, kNumFlags);
    row.getCell(3).numFmt = EUR_FMT;
    row.getCell(3).font = { name: 'Calibri', bold: true, size: 10, color: { argb: BRAND.danger } };
  });
  [6, 32, 20, 12, 14].forEach((w, i) => { ws4.getColumn(i + 1).width = w; });
  configurePage(ws4);

  // ── Sheet 5: Custos por Categoria ──
  if (options.costBreakdown && options.costBreakdown.length > 0) {
    const ws5 = wb.addWorksheet('Custos por Categoria', {
      properties: { tabColor: { argb: BRAND.danger } },
      views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
    });
    applyBrandHeader(ws5, { title: 'Custos por Categoria — Estimado vs Real', workspaceName: options.workspaceName, periodLabel, colCount: 4 });

    const bNumFlags = [false, true, true, true];
    styleHeaderRow(ws5.addRow(['Categoria', 'Estimado', 'Real', 'Variação']), bNumFlags);
    options.costBreakdown.forEach((c, i) => {
      const row = ws5.addRow([c.category, c.estimated, c.actual, c.variance]);
      styleDataRow(row, i, bNumFlags);
      row.getCell(2).numFmt = EUR_FMT;
      row.getCell(3).numFmt = EUR_FMT;
      row.getCell(4).numFmt = EUR_FMT;
      if (c.variance > 0) row.getCell(4).font = { name: 'Calibri', bold: true, size: 10, color: { argb: BRAND.danger } };
      else if (c.variance < 0) row.getCell(4).font = { name: 'Calibri', bold: true, size: 10, color: { argb: BRAND.success } };
    });
    [26, 18, 18, 18].forEach((w, i) => { ws5.getColumn(i + 1).width = w; });
    configurePage(ws5);
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
