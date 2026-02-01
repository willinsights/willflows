

# Plano: Padronizar Exportações para Excel + PDF

## Problema Identificado

O sistema tem exportações inconsistentes em diferentes formatos:

| Componente | Formato Actual | Formato Esperado |
|------------|----------------|------------------|
| `Finalizados.tsx` | CSV (botão explícito) | **Excel** |
| `PaymentExportButtons.tsx` | Excel ✓ | Manter |
| `Relatorios.tsx` | Excel ✓ | Manter |
| `useExportReport.ts` (hook) | CSV / JSON | **Excel** |
| `export-report` (Edge Function) | CSV / JSON | **Excel** |
| `excel-export.ts` (utilitário) | Excel ✓ | Manter |

**Benefícios da padronização para Excel:**
- Formatação profissional (cores, headers, linhas zebradas)
- Sem problemas de encoding UTF-8 (caracteres portugueses)
- Já existe a biblioteca `ExcelJS` instalada e configurada
- Consistência com a memória `tech/reporting/excel-export-standardization`

---

## Ficheiros a Modificar

### Frontend (3 ficheiros)

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/app/Finalizados.tsx` | Substituir `exportToCSV()` por `exportToExcel()` |
| `src/hooks/useExportReport.ts` | Mudar `ExportFormat` para `'excel' \| 'pdf'` |

### Backend (1 ficheiro)

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/export-report/index.ts` | Gerar Excel usando formatos compatíveis com Deno |

---

## Secção Técnica

### 1. `src/pages/app/Finalizados.tsx`

**Remover a função `exportToCSV()` (linhas 225-295) e substituir por:**

```typescript
const exportToExcel = async () => {
  if (completedProjects.length === 0) return;

  const { exportToExcel: doExport } = await import('@/lib/excel-export');
  
  // Build headers based on permissions
  const headers = canViewAllFinancials 
    ? ['Código', 'Projeto', 'Cliente', 'Tipo', 'Data de Entrega', 'Captação', 'Edição', 'Preço Cliente', 'Custos', 'Lucro']
    : ['Código', 'Projeto', 'Cliente', 'Tipo', 'Data de Entrega', 'Captação', 'Edição'];
  
  const data = completedProjects.map(project => {
    const team = projectTeams[project.id] || { captacao: [], edicao: [] };
    const custo = (project.custo_captacao || 0) + (project.custo_edicao || 0) + (project.custos_extras || 0);
    const lucro = (project.agreed_value || 0) - custo;
    
    const row: (string | number)[] = [
      project.project_code || project.id.slice(0, 8).toUpperCase(),
      project.name,
      project.clients?.name || 'Sem cliente',
      typeLabels[project.type],
      project.delivered_at ? format(new Date(project.delivered_at), 'dd/MM/yyyy') : 'N/A',
      getTeamNames(team.captacao),
      getTeamNames(team.edicao),
    ];
    
    if (canViewAllFinancials) {
      row.push(formatCurrency(project.agreed_value || 0));
      row.push(formatCurrency(custo));
      row.push(formatCurrency(lucro));
    }
    
    return row;
  });

  await doExport({
    title: 'Projetos Finalizados',
    subtitle: currentWorkspace?.name || 'WillFlow',
    headers,
    data,
    filename: `projetos-finalizados-${format(new Date(), 'yyyy-MM-dd')}`,
  });
};
```

**Actualizar botão (linha 435):**
```tsx
<Button variant="outline" size="sm" className="gap-2" onClick={exportToExcel}>
  <FileSpreadsheet className="h-4 w-4" />
  Excel
</Button>
```

### 2. `src/hooks/useExportReport.ts`

**Linha 6 - Mudar tipo de formato:**
```typescript
export type ExportFormat = 'excel' | 'pdf';
```

### 3. `supabase/functions/export-report/index.ts`

**Linha 16 - Actualizar interface:**
```typescript
format: 'excel' | 'pdf';
```

**Substituir função `convertToCSV` por geração Excel usando CSV com BOM:**

Para manter compatibilidade com Deno (sem dependências externas complexas), gerar CSV com formatação Excel-compatível:

```typescript
function convertToExcelCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  // BOM for UTF-8 Excel compatibility
  const BOM = '\ufeff';
  const headers = Object.keys(data[0]);
  
  const csvRows = [
    headers.map(h => `"${h}"`).join(';'),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '""';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(';')
    )
  ];

  return BOM + csvRows.join('\n');
}
```

**Actualizar lógica de formato (linhas 349-357):**
```typescript
if (format === 'excel') {
  content = convertToExcelCSV(data);
  contentType = 'text/csv;charset=utf-8';
  fileName += '.csv'; // Excel-compatible CSV
} else {
  // PDF generation would require additional library
  throw new Error('PDF export not yet implemented in background jobs');
}
```

---

## Resumo das Alterações

```text
┌─────────────────────────────┬─────────────────────┐
│ Antes                       │ Depois              │
├─────────────────────────────┼─────────────────────┤
│ Finalizados: CSV            │ Excel (.xlsx)       │
│ Edge Function: CSV/JSON     │ Excel (.csv UTF-8)  │
│ Hook: 'csv' | 'json'        │ 'excel' | 'pdf'     │
│ PaymentExportButtons: Excel │ Sem alteração       │
│ Relatorios: Excel           │ Sem alteração       │
└─────────────────────────────┴─────────────────────┘
```

**Formatos finais disponíveis:**
- **Excel** - Para dados tabulares (projectos, pagamentos, clientes)
- **PDF** - Para relatórios formatados com gráficos

