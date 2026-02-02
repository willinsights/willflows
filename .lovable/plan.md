
# Plano: Unificar Layout de Exportações de Dados

## Objectivo
Padronizar todas as exportações (Excel e PDF) para seguir o mesmo layout profissional utilizado na página "Projetos Finalizados", garantindo consistência visual em toda a aplicação.

---

## Análise do Layout de Referência (Projetos Finalizados)

### Excel
- Utiliza a função central `exportToExcel` de `@/lib/excel-export.ts`
- Cabeçalhos com cor da marca (#8224E3)
- Linhas alternadas (zebra stripes) com tom roxo claro (#F8F4FF)
- Auto-ajuste de colunas
- Título, subtítulo, data e contagem de registos

### PDF
- Barra lateral roxa à esquerda (`border-left: 4px solid #8224e3`)
- Barra de estatísticas com gradiente roxo
- Tabela com cabeçalhos roxos (#8224E3)
- Linhas zebra
- Rodapé com marca "WillFlow" e data de geração
- Cores: verde para valores positivos, vermelho para negativos

---

## Problemas Identificados

### 1. `PaymentExportButtons.tsx` (Pagamentos)
| Aspecto | Actual | Esperado |
|---------|--------|----------|
| Excel | Lógica inline sem formatação | Usar `exportToExcel` central |
| PDF Header | `border-bottom: 3px solid` | `border-left: 4px solid` |
| Stats bar | Diferente | Gradiente roxo consistente |
| Rodapé | Centrado | Flex com marca à esquerda |

### 2. `Relatorios.tsx` 
- **Excel**: Já usa `exportMultiSectionToExcel` ✅
- **PDF**: Layout correcto mas código duplicado no ficheiro

---

## Solução

### Fase 1: Criar Utilidades Centrais

Criar `src/lib/pdf-export.ts` com template HTML reutilizável que replica o estilo de "Projetos Finalizados".

### Fase 2: Refatorar PaymentExportButtons.tsx

1. **Excel**: Substituir lógica inline por `exportToExcel` de `@/lib/excel-export.ts`
2. **PDF**: Alinhar estilos com o template de referência

---

## Alterações de Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/pdf-export.ts` | **Novo** - Template HTML central para PDFs |
| `src/components/payments/PaymentExportButtons.tsx` | Refatorar para usar utilidades centrais |

---

## Secção Técnica

### Novo ficheiro: `src/lib/pdf-export.ts`

```typescript
export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  workspaceName: string;
  statsBar?: { label: string; value: string; className?: string }[];
  headers: string[];
  data: { cells: string[]; rowClass?: string }[];
  footer?: {
    brand: string;
    date: string;
  };
}

export function generatePdfHtml(options: PdfExportOptions): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${options.title}</title>
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
        .stat-value.primary { color: #8224e3; }
        .stat-value.warning { color: #ca8a04; }
        .stat-value.destructive { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #e5e5e5; padding: 10px 8px; text-align: left; }
        th { background: #8224e3; color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; }
        tr:nth-child(even) { background-color: #fafafa; }
        tr:hover { background-color: #f5f0ff; }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; }
        .footer-brand { color: #8224e3; font-weight: 600; font-size: 14px; }
        .footer-date { color: #999; font-size: 11px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <!-- Content generated from options -->
    </body>
    </html>
  `;
}
```

### Alterações em PaymentExportButtons.tsx

**Excel** - Substituir linhas 138-237 por:

```typescript
const exportToExcelHandler = async () => {
  const { exportToExcel: doExport } = await import('@/lib/excel-export');
  const labels = getColumnLabels();
  const keys = getRelevantKeys();
  
  await doExport({
    title: reportTitle,
    subtitle: workspaceName,
    headers: keys.map(k => labels[k]),
    data: data.map(row => keys.map(key => String(row[key as keyof ExportData] || '-'))),
    filename: `${filename}-${currentDateFile}`,
  });
};
```

**PDF** - Alinhar estilos:

1. Mudar header de `border-bottom: 3px` para `border-left: 4px`
2. Uniformizar stats-bar com gradiente `linear-gradient(135deg, #f8f4ff 0%, #f0e8ff 100%)`
3. Padronizar footer com layout flex (marca à esquerda, data à direita)
4. Usar mesmas classes de cores (`.success`, `.primary`, etc.)

---

## Resultado Visual Esperado

Após as alterações, todos os exports terão:

- ✅ Barra lateral roxa no cabeçalho
- ✅ Gradiente roxo na barra de estatísticas  
- ✅ Tabelas com cabeçalhos #8224E3
- ✅ Linhas zebra consistentes
- ✅ Rodapé com marca WillFlow à esquerda
- ✅ Excel com formatação profissional via `exportToExcel`

---

## Resumo de Alterações

| Ficheiro | Linhas | Tipo |
|----------|--------|------|
| `src/lib/pdf-export.ts` | ~80 | Novo |
| `src/components/payments/PaymentExportButtons.tsx` | ~200 linhas modificadas | Refatorar |
