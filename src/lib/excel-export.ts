// exceljs (~600KB) is loaded lazily inside each exported function via dynamic import.
// Types are imported statically (zero runtime cost).
import type * as ExcelJS from 'exceljs';
let _ExcelJS: typeof ExcelJS | undefined;
async function loadExcelJS(): Promise<typeof ExcelJS> {
  if (!_ExcelJS) _ExcelJS = await import('exceljs');
  return _ExcelJS;
}
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export interface ExcelExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  data: (string | number)[][];
  filename: string;
  brandColor?: string;
}

export interface ExcelExportMultiSectionOptions {
  title: string;
  subtitle?: string;
  sections: {
    title: string;
    headers: string[];
    data: (string | number)[][];
    showTotal?: boolean;
  }[];
  filename: string;
  brandColor?: string;
}

/**
 * Export data to Excel (.xlsx) with professional formatting
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WillFlow';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Dados');
  const brandColor = options.brandColor || '8224E3';

  // Title section
  const titleRow = worksheet.addRow([options.title]);
  titleRow.font = { bold: true, size: 16, color: { argb: brandColor } };
  worksheet.mergeCells(`A1:${String.fromCharCode(64 + options.headers.length)}1`);

  if (options.subtitle) {
    const subtitleRow = worksheet.addRow([options.subtitle]);
    subtitleRow.font = { size: 12, color: { argb: '666666' } };
  }

  const dateRow = worksheet.addRow([`Exportado: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`]);
  dateRow.font = { size: 10, color: { argb: '999999' } };

  worksheet.addRow([`Total: ${options.data.length} registos`]).font = { size: 10, color: { argb: '999999' } };
  worksheet.addRow([]); // Empty row

  // Column headers with styling
  const headerRow = worksheet.addRow(options.headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brandColor },
    };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: brandColor } },
    };
  });

  // Data rows
  options.data.forEach((row, index) => {
    const dataRow = worksheet.addRow(row);
    if (index % 2 === 1) {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F4FF' },
        };
      });
    }
  });

  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    const maxLength = Math.max(
      options.headers[index]?.length || 10,
      ...options.data.map(row => String(row[index] || '').length)
    );
    column.width = Math.min(Math.max(maxLength + 2, 12), 40);
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, options.filename);
}

/**
 * Export multi-section report to Excel (.xlsx)
 */
export async function exportMultiSectionToExcel(options: ExcelExportMultiSectionOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WillFlow';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Relatório');
  const brandColor = options.brandColor || '8224E3';

  // Title section
  const titleRow = worksheet.addRow([options.title]);
  titleRow.font = { bold: true, size: 18, color: { argb: brandColor } };

  if (options.subtitle) {
    const subtitleRow = worksheet.addRow([options.subtitle]);
    subtitleRow.font = { size: 12, color: { argb: '666666' } };
  }

  const dateRow = worksheet.addRow([`Exportado: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`]);
  dateRow.font = { size: 10, color: { argb: '999999' } };

  worksheet.addRow([]); // Empty row

  // Process each section
  options.sections.forEach((section) => {
    worksheet.addRow([]); // Empty row before section

    // Section title
    const sectionTitleRow = worksheet.addRow([section.title]);
    sectionTitleRow.font = { bold: true, size: 12, color: { argb: brandColor } };

    // Section headers
    const headerRow = worksheet.addRow(section.headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: brandColor },
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Section data
    section.data.forEach((row, index) => {
      const dataRow = worksheet.addRow(row);
      if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F4FF' },
          };
        });
      }
    });
  });

  // Auto-fit columns based on all sections
  const maxCols = Math.max(...options.sections.map(s => s.headers.length));
  for (let i = 0; i < maxCols; i++) {
    const allValues = options.sections.flatMap(s => [
      s.headers[i] || '',
      ...s.data.map(row => String(row[i] || ''))
    ]);
    const maxLength = Math.max(...allValues.map(v => v.length));
    if (worksheet.columns[i]) {
      worksheet.columns[i].width = Math.min(Math.max(maxLength + 2, 12), 40);
    }
  }

  // Generate and download
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
