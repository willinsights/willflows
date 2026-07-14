// exceljs (~600KB) is loaded lazily inside each exported function via dynamic import.
import type * as ExcelJS from 'exceljs';
let _ExcelJS: typeof ExcelJS | undefined;
async function loadExcelJS(): Promise<typeof ExcelJS> {
  if (!_ExcelJS) _ExcelJS = await import('exceljs');
  return _ExcelJS;
}
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// WillFlow brand palette (ARGB, no leading #)
const BRAND = {
  primary: 'FF7C3AED',        // roxo WillFlow
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

export interface ExcelExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  data: (string | number)[][];
  filename: string;
  clientName?: string;
  periodLabel?: string;
  disclaimer?: string;
  totalsLabel?: string;
  brandColor?: string;
}

export interface ExcelSection {
  title: string;
  headers: string[];
  data: (string | number)[][];
  showTotal?: boolean;
}

export interface ExcelExportMultiSectionOptions {
  title: string;
  subtitle?: string;
  sections: ExcelSection[];
  filename: string;
  clientName?: string;
  periodLabel?: string;
  disclaimer?: string;
  brandColor?: string;
}

export interface ExcelSheetSpec {
  name: string;         // Worksheet tab name (max ~31 chars)
  title: string;        // Title shown in the branded header of the sheet
  sections: ExcelSection[];
}

export interface ExcelExportMultiSheetOptions {
  title: string;
  subtitle?: string;
  sheets: ExcelSheetSpec[];
  filename: string;
  clientName?: string;
  periodLabel?: string;
  disclaimer?: string;
}

// Detects numeric / currency columns to apply € format + right alignment
function isCurrencyHeader(label: string): boolean {
  if (isTextHeader(label)) return false;
  return /(valor|preço|preco|custo|total|receita|lucro|saldo|montante|iva|€|pago|pendente|vencido)/i.test(label);
}

// Headers that must always render as plain text (dates, codes, names, statuses).
// Prevents parseCurrency from converting values like "22/05/2026" or "AB1234CD" into numbers.
function isTextHeader(label: string): boolean {
  return /(data|código|codigo|referência|referencia|projeto|nome|cliente|detalhe|status|tipo|categoria|descrição|descricao|observ|período|periodo|mês|mes|ano|dia|hora|email|telefone|nif|iban|morada)/i.test(label);
}

// Attempts to parse a cell that may be a currency string like "-€ 1.234,56" or "+1.234,56 €"
function parseCurrency(v: string | number): number | null {
  if (typeof v === 'number') return v;
  if (!v || v === '-') return null;
  const s = String(v).replace(/<[^>]*>/g, '').trim();
  const negative = /^[\-−–]/.test(s) || /\(.+\)/.test(s);
  const cleaned = s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (!isFinite(num)) return null;
  return negative && num > 0 ? -num : num;
}

const EUR_FMT = '#,##0.00\\ "€";[Red]-#,##0.00\\ "€";"—"';

function applyBrandHeader(
  worksheet: ExcelJS.Worksheet,
  opts: { title: string; subtitle?: string; workspaceName?: string; clientName?: string; periodLabel?: string; colCount: number },
) {
  const cols = Math.max(1, opts.colCount);
  const lastColLetter = (n: number) => {
    let s = ''; let x = n;
    while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); }
    return s;
  };
  const L = lastColLetter(cols);

  // Row 1 — brand band
  const brandRow = worksheet.addRow(['WillFlow']);
  worksheet.mergeCells(`A1:${L}1`);
  brandRow.height = 34;
  brandRow.getCell(1).value = 'WillFlow';
  brandRow.getCell(1).font = { name: 'Calibri', bold: true, size: 18, color: { argb: BRAND.headerText } };
  brandRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  brandRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primary } };

  // Row 2 — document title
  const titleRow = worksheet.addRow([opts.title]);
  worksheet.mergeCells(`A2:${L}2`);
  titleRow.height = 26;
  titleRow.getCell(1).font = { name: 'Calibri', bold: true, size: 15, color: { argb: BRAND.ink } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 3 — meta line
  const metaParts: string[] = [];
  if (opts.workspaceName) metaParts.push(opts.workspaceName);
  if (opts.clientName) metaParts.push(`Cliente: ${opts.clientName}`);
  if (opts.periodLabel) metaParts.push(`Período: ${opts.periodLabel}`);
  metaParts.push(`Emitido: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`);
  const metaRow = worksheet.addRow([metaParts.join('   ·   ')]);
  worksheet.mergeCells(`A3:${L}3`);
  metaRow.height = 18;
  metaRow.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: BRAND.mute } };
  metaRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 4 — spacer thin band
  const spacer = worksheet.addRow(['']);
  worksheet.mergeCells(`A4:${L}4`);
  spacer.height = 6;
  spacer.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.bandBg } };

  worksheet.addRow([]); // Row 5 — empty
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
    cell.border = {
      bottom: { style: 'hair', color: { argb: BRAND.border } },
    };
    if (zebra) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.zebra } };
    }
    if (isNum) {
      cell.numFmt = EUR_FMT;
    }
  });
}

function applyTotalsRow(worksheet: ExcelJS.Worksheet, label: string, values: (number | null)[], numericFlags: boolean[]) {
  const rowValues: (string | number | null)[] = numericFlags.map((f, i) => (f ? values[i] : ''));
  const firstNonNumIdx = numericFlags.findIndex(f => !f);
  const labelIdx = firstNonNumIdx === -1 ? 0 : firstNonNumIdx;
  rowValues[labelIdx] = label;
  const row = worksheet.addRow(rowValues);
  row.height = 22;
  row.eachCell((cell, colNumber) => {
    const isNum = numericFlags[colNumber - 1];
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: BRAND.primaryDark } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.totalsBg } };
    cell.alignment = { horizontal: isNum ? 'right' : 'left', vertical: 'middle', indent: 1 };
    cell.border = {
      top: { style: 'medium', color: { argb: BRAND.primary } },
      bottom: { style: 'medium', color: { argb: BRAND.primary } },
    };
    if (isNum) cell.numFmt = EUR_FMT;
  });
}

function setColumnWidths(worksheet: ExcelJS.Worksheet, headers: string[], data: (string | number)[][]) {
  worksheet.columns.forEach((column, index) => {
    const maxLength = Math.max(
      (headers[index] || '').length,
      ...data.map(row => String(row[index] ?? '').length),
    );
    column.width = Math.min(Math.max(maxLength + 4, 14), 48);
  });
}

function configurePage(worksheet: ExcelJS.Worksheet) {
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
    horizontalCentered: true,
    printTitlesRow: '6:6',
  };
  worksheet.headerFooter = {
    oddFooter: '&L&"Calibri,Regular"&8&K7C3AEDWillFlow&K000000 · Documento gerado automaticamente&C&"Calibri,Regular"&8Página &P de &N&R&"Calibri,Regular"&8' + format(new Date(), 'dd/MM/yyyy HH:mm'),
  };
}

/**
 * Export data to Excel (.xlsx) with premium WillFlow formatting.
 * Data & values remain unchanged; only presentation is enhanced.
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const ExcelJSLib = await loadExcelJS();
  const workbook = new ExcelJSLib.Workbook();
  workbook.creator = 'WillFlow';
  workbook.company = 'WillFlow';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Relatório', {
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
  });

  applyBrandHeader(worksheet, {
    title: options.title,
    subtitle: options.subtitle,
    workspaceName: options.subtitle,
    clientName: options.clientName,
    periodLabel: options.periodLabel,
    colCount: options.headers.length,
  });

  // Numeric column detection
  const numericFlags = options.headers.map((h, i) => {
    if (isCurrencyHeader(h)) return true;
    let numeric = 0, filled = 0;
    for (const row of options.data) {
      const v = row[i];
      if (v === undefined || v === '' || v === '-' || v === null) continue;
      filled++;
      if (parseCurrency(v) !== null) numeric++;
    }
    return filled > 0 && numeric / filled >= 0.6;
  });

  // Header row (row 6)
  const headerRow = worksheet.addRow(options.headers);
  styleHeaderRow(headerRow, numericFlags);

  // Data rows — convert currency strings to numbers
  const totals = new Array(options.headers.length).fill(0) as number[];
  const totalCounts = new Array(options.headers.length).fill(0) as number[];

  options.data.forEach((row, index) => {
    const converted = row.map((cell, colIdx) => {
      if (numericFlags[colIdx]) {
        const num = parseCurrency(cell);
        if (num !== null) {
          totals[colIdx] += num;
          totalCounts[colIdx]++;
          return num;
        }
        return typeof cell === 'number' ? cell : '';
      }
      // strip HTML tags from status cells etc.
      return typeof cell === 'string' ? cell.replace(/<[^>]*>/g, '').trim() : cell;
    });
    const dataRow = worksheet.addRow(converted);
    styleDataRow(dataRow, index, numericFlags);
  });

  // Totals row (if any numeric column had values)
  if (totalCounts.some(c => c > 0)) {
    const totalValues = totals.map((t, i) => (totalCounts[i] > 0 ? t : null));
    applyTotalsRow(worksheet, options.totalsLabel || 'TOTAL', totalValues, numericFlags);
  }

  // Disclaimer row
  if (options.disclaimer) {
    worksheet.addRow([]);
    const dRow = worksheet.addRow([options.disclaimer]);
    worksheet.mergeCells(`A${dRow.number}:${String.fromCharCode(64 + options.headers.length)}${dRow.number}`);
    dRow.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: BRAND.mute } };
    dRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  }

  setColumnWidths(worksheet, options.headers, options.data);
  configurePage(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, options.filename);
}

/**
 * Render a set of sections into an existing worksheet using the brand styling.
 * Adds the brand header, sections, optional disclaimer and page setup.
 */
function renderSectionsToWorksheet(
  worksheet: ExcelJS.Worksheet,
  spec: {
    title: string;
    subtitle?: string;
    clientName?: string;
    periodLabel?: string;
    sections: ExcelSection[];
    disclaimer?: string;
  },
) {
  const maxCols = Math.max(1, ...spec.sections.map(s => s.headers.length));
  applyBrandHeader(worksheet, {
    title: spec.title,
    subtitle: spec.subtitle,
    workspaceName: spec.subtitle,
    clientName: spec.clientName,
    periodLabel: spec.periodLabel,
    colCount: maxCols,
  });

  spec.sections.forEach((section) => {
    worksheet.addRow([]);
    const sTitle = worksheet.addRow([section.title]);
    worksheet.mergeCells(`A${sTitle.number}:${String.fromCharCode(64 + Math.max(1, section.headers.length))}${sTitle.number}`);
    sTitle.getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: BRAND.primaryDark } };
    sTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    sTitle.height = 20;

    const numericFlags = section.headers.map((h, i) => {
      if (isCurrencyHeader(h)) return true;
      let numeric = 0, filled = 0;
      for (const row of section.data) {
        const v = row[i];
        if (v === undefined || v === '' || v === '-' || v === null) continue;
        filled++;
        if (parseCurrency(v) !== null) numeric++;
      }
      return filled > 0 && numeric / filled >= 0.6;
    });

    const headerRow = worksheet.addRow(section.headers);
    styleHeaderRow(headerRow, numericFlags);

    const totals = new Array(section.headers.length).fill(0) as number[];
    const counts = new Array(section.headers.length).fill(0) as number[];

    section.data.forEach((row, index) => {
      const converted = row.map((cell, colIdx) => {
        if (numericFlags[colIdx]) {
          const num = parseCurrency(cell);
          if (num !== null) {
            totals[colIdx] += num;
            counts[colIdx]++;
            return num;
          }
          return typeof cell === 'number' ? cell : '';
        }
        return typeof cell === 'string' ? cell.replace(/<[^>]*>/g, '').trim() : cell;
      });
      const dRow = worksheet.addRow(converted);
      styleDataRow(dRow, index, numericFlags);
    });

    if (section.showTotal && counts.some(c => c > 0)) {
      applyTotalsRow(worksheet, 'TOTAL', totals.map((t, i) => (counts[i] > 0 ? t : null)), numericFlags);
    }
  });

  for (let i = 0; i < maxCols; i++) {
    const values = spec.sections.flatMap(s => [
      s.headers[i] || '',
      ...s.data.map(row => String(row[i] ?? '')),
    ]);
    const maxLength = Math.max(0, ...values.map(v => v.length));
    if (worksheet.columns[i]) {
      worksheet.columns[i].width = Math.min(Math.max(maxLength + 4, 14), 48);
    }
  }

  if (spec.disclaimer) {
    worksheet.addRow([]);
    const dRow = worksheet.addRow([spec.disclaimer]);
    worksheet.mergeCells(`A${dRow.number}:${String.fromCharCode(64 + maxCols)}${dRow.number}`);
    dRow.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: BRAND.mute } };
    dRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  }

  configurePage(worksheet);
}

/**
 * Export multi-section report with the same premium formatting (single worksheet).
 */
export async function exportMultiSectionToExcel(options: ExcelExportMultiSectionOptions): Promise<void> {
  const ExcelJSLib = await loadExcelJS();
  const workbook = new ExcelJSLib.Workbook();
  workbook.creator = 'WillFlow';
  workbook.company = 'WillFlow';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Relatório', {
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
  });

  renderSectionsToWorksheet(worksheet, {
    title: options.title,
    subtitle: options.subtitle,
    clientName: options.clientName,
    periodLabel: options.periodLabel,
    sections: options.sections,
    disclaimer: options.disclaimer,
  });

  configurePage(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, options.filename);
}

/**
 * Export a workbook with multiple named worksheets, each with its own sections.
 */
export async function exportMultiSheetToExcel(options: ExcelExportMultiSheetOptions): Promise<void> {
  const ExcelJSLib = await loadExcelJS();
  const workbook = new ExcelJSLib.Workbook();
  workbook.creator = 'WillFlow';
  workbook.company = 'WillFlow';
  workbook.created = new Date();

  options.sheets.forEach((sheet) => {
    // Excel worksheet names must be ≤ 31 chars and cannot contain []:*?/\
    const safeName = sheet.name.replace(/[\[\]:*?/\\]/g, ' ').slice(0, 31);
    const worksheet = workbook.addWorksheet(safeName, {
      views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
    });
    renderSectionsToWorksheet(worksheet, {
      title: sheet.title,
      subtitle: options.subtitle,
      clientName: options.clientName,
      periodLabel: options.periodLabel,
      sections: sheet.sections,
      disclaimer: options.disclaimer,
    });
    configurePage(worksheet);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, options.filename);
}


function downloadBuffer(buffer: ExcelJS.Buffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
