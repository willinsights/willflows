
# Plano: Unificar Exportações para Excel (.xlsx)

## Situação Actual

Existe inconsistência nos formatos de exportação:

| Área | Formato Actual | Biblioteca |
|------|----------------|------------|
| Pagamentos | `.xlsx` (Excel real) | ExcelJS |
| Relatórios Financeiros | `.csv` (rotulado como "Excel") | Manual |
| Admin (Users) | `.csv` | Manual |

## Decisão: Padronizar em Excel (.xlsx)

**Razões:**
- Melhor compatibilidade com Excel português (sem problemas de encoding)
- Formatação profissional (cores, bordas, larguras de colunas)
- Já utilizado com sucesso na página de Pagamentos
- ExcelJS já está instalado no projecto

---

## Alterações

### 1. `src/pages/app/Relatorios.tsx`

Converter `handleExportExcel` de CSV para Excel real:

**Antes:**
```typescript
const handleExportExcel = () => {
  let csvContent = '\ufeff';
  // ... gera CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  link.download = `relatorio-financeiro-${date}.csv`;
}
```

**Depois:**
```typescript
import ExcelJS from 'exceljs';

const handleExportExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório Financeiro');
  
  // Header profissional
  worksheet.addRow([`Relatório Financeiro - ${workspaceName}`]);
  worksheet.addRow([`Período: ${dateRange}`]);
  worksheet.addRow([`Exportado: ${currentDateTime}`]);
  worksheet.addRow([]);
  
  // Evolução Mensal (com headers estilizados)
  worksheet.addRow(['EVOLUÇÃO MENSAL']);
  const headerRow = worksheet.addRow(['Mês', 'Receita', 'Custos', 'Lucro', 'Margem', 'Projetos']);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8224E3' } };
  
  monthlyData.forEach(m => {
    worksheet.addRow([m.fullMonth, m.receita, m.custos, m.lucro, `${m.margin}%`, m.projetos]);
  });
  
  // ... Top Clientes, Top Colaboradores
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  link.download = `relatorio-financeiro-${date}.xlsx`;
}
```

### 2. `src/components/admin/UsersSummaryTab.tsx`

Converter `exportToCSV` para `exportToExcel`:

**Antes:** Função gera CSV com encoding UTF-8 BOM

**Depois:**
```typescript
import ExcelJS from 'exceljs';

const exportToExcel = async (type: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title);
  
  // Header
  worksheet.addRow([title]);
  worksheet.addRow(['WillFlow Admin Export']);
  worksheet.addRow([`Exportado: ${currentDateTime}`]);
  worksheet.addRow([`Total: ${data.length} registos`]);
  worksheet.addRow([]);
  
  // Headers com estilo
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  
  // Data
  data.forEach(row => worksheet.addRow(row));
  
  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  link.download = `${filename.replace('.csv', '')}.xlsx`;
}
```

### 3. `src/components/admin/users-management/UsersSummarySection.tsx`

Mesma alteração - converter de CSV para Excel usando ExcelJS.

---

## Visual Comparativo

**CSV (antes):**
```
"Relatório Financeiro"
"WillFlow"
"Período: 1 Jan 2026 - 1 Fev 2026"

"Mês";"Receita";"Custos"
"Janeiro";"€5.000,00";"€2.000,00"
```

**Excel (depois):**
```
┌─────────────────────────────────────────────────┐
│ A                    │ B        │ C        │ D │
├─────────────────────────────────────────────────┤
│ Relatório Financeiro - WillFlow                 │
│ Período: 1 Jan - 1 Fev 2026                     │
│ Exportado: 01 Fev 2026 às 15:50                 │
│                                                 │
│ [Mês]  │ [Receita] │ [Custos] │ [Lucro]        │  ← Header com cor
│ Janeiro│  €5.000   │  €2.000  │  €3.000        │
│ Fevere.│  €8.000   │  €3.500  │  €4.500        │
└─────────────────────────────────────────────────┘
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/app/Relatorios.tsx` | Converter handleExportExcel para usar ExcelJS |
| `src/components/admin/UsersSummaryTab.tsx` | Converter exportToCSV para Excel |
| `src/components/admin/users-management/UsersSummarySection.tsx` | Converter exportToCSV para Excel |

---

## Secção Técnica

### Criação de Helper Reutilizável

Para evitar duplicação, criar um utilitário:

```typescript
// src/lib/excel-export.ts
import ExcelJS from 'exceljs';

interface ExcelExportOptions {
  title: string;
  subtitle?: string;
  date: string;
  headers: string[];
  data: (string | number)[][];
  filename: string;
  brandColor?: string;
}

export async function exportToExcel(options: ExcelExportOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WillFlow';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('Dados');
  
  // Header section
  worksheet.addRow([options.title]);
  if (options.subtitle) worksheet.addRow([options.subtitle]);
  worksheet.addRow([`Exportado: ${options.date}`]);
  worksheet.addRow([`Total: ${options.data.length} registos`]);
  worksheet.addRow([]);
  
  // Column headers with styling
  const headerRow = worksheet.addRow(options.headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: options.brandColor || '8224E3' },
  };
  
  // Data rows
  options.data.forEach(row => worksheet.addRow(row));
  
  // Auto-fit columns
  worksheet.columns.forEach((col, i) => {
    col.width = i === 0 ? 15 : 20;
  });
  
  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Utilização Simplificada

```typescript
// Em Relatorios.tsx
import { exportToExcel } from '@/lib/excel-export';

const handleExportExcel = () => {
  exportToExcel({
    title: 'Relatório Financeiro',
    subtitle: currentWorkspace?.name,
    date: format(new Date(), "dd MMM yyyy 'às' HH:mm", { locale: pt }),
    headers: ['Mês', 'Receita', 'Custos', 'Lucro', 'Margem', 'Projetos'],
    data: monthlyData.map(m => [
      m.fullMonth, 
      formatCurrency(m.receita), 
      formatCurrency(m.custos), 
      formatCurrency(m.lucro),
      `${m.margin.toFixed(1)}%`,
      m.projetos
    ]),
    filename: `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}`,
  });
};
```

### Botões Actualizados

Todos os botões de exportação passam a ter comportamento async:

```tsx
<Button onClick={handleExportExcel} disabled={isExporting}>
  <FileSpreadsheet className="h-4 w-4 mr-2" />
  {isExporting ? 'A exportar...' : 'Excel'}
</Button>
```
