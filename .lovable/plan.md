
# Plano: Expandir Privacy Mode para Todo o Aplicativo

## Situação Atual

O recurso de "Ocultar Valores" (Privacy Mode) existe apenas em componentes específicos do **Dashboard**. O botão toggle está no `DashboardHeader.tsx` e os valores são ocultados apenas em:

| Componente | Localização | Estado |
|------------|-------------|--------|
| `FinancialForecastCards` | Dashboard | ✅ Protegido |
| `FinancialChart` | Dashboard | ✅ Protegido |
| `MonthlyGoalsCard` | Dashboard | ✅ Protegido |
| `MobileKPICarousel` | Mobile Dashboard | ✅ Protegido |
| `MobilePendingPayments` | Mobile Dashboard | ✅ Protegido |

### Componentes SEM Proteção (expostos)

| Componente/Página | Valores Exibidos |
|-------------------|------------------|
| **Pagamentos.tsx** | Summary cards, previsão mensal, tabelas de receitas |
| **Finalizados.tsx** | Receita total, média por projeto, tabela de lucros |
| **Relatorios.tsx** | Gráficos financeiros, totais, tabelas de análise |
| **Faturacao.tsx** | Valores de faturas Stripe |
| **ProjectFinancialTab** | Preço cliente, custos, lucro por projeto |
| **ProjectRevenueControl** | Tabela de receitas de projetos |
| **FreelancerPaymentsControl** | Pagamentos a colaboradores |
| **ClientPaymentsControl** | Pagamentos de clientes |
| **ExtraCostsPaymentsControl** | Custos extras |
| **LeadCard** | Valor estimado do lead |

---

## O Que Vamos Fazer

### 1. Expandir o Toggle para Mais Locais

Adicionar o botão de toggle (olho/olho riscado) ao header de cada página que exibe valores financeiros:
- Pagamentos
- Finalizados
- Relatórios
- Faturação

### 2. Proteger Todos os Valores Financeiros

Aplicar a classe `blur-md select-none` condicionalmente em todos os elementos que exibem valores monetários quando `hideValues` estiver ativo.

---

## Ficheiros a Modificar

### Páginas Principais

1. **`src/pages/app/Pagamentos.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger summary cards (linhas 466, 476, 486)
   - Proteger cards de previsão mensal (linhas 565-627)
   - Proteger valores na lista de projetos (linhas 681-682)
   - Adicionar botão toggle ao header

2. **`src/pages/app/Finalizados.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger cards de resumo (linha 665)
   - Proteger valores nas tabelas

3. **`src/pages/app/Relatorios.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger todos os valores nos gráficos e tabelas

4. **`src/pages/app/Faturacao.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger valores das faturas (linha 346)

### Componentes de Pagamentos

5. **`src/components/payments/ProjectRevenueControl.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger totais e valores na tabela

6. **`src/components/payments/FreelancerPaymentsControl.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger totais e valores na tabela

7. **`src/components/payments/ClientPaymentsControl.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger totais e valores na tabela

8. **`src/components/payments/ExtraCostsPaymentsControl.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger valores na tabela

### Componentes de Projetos e Leads

9. **`src/components/projects/ProjectFinancialTab.tsx`**
   - Adicionar `useHideValues` hook
   - Proteger todos os valores (preço, custos, lucro)

10. **`src/components/leads/LeadCard.tsx`**
    - Adicionar `useHideValues` hook
    - Proteger valor estimado do lead

---

## Padrão de Implementação

Para cada componente, seguir este padrão:

```typescript
// 1. Importar o hook
import { useHideValues } from '@/hooks/useHideValues';

// 2. Usar o hook no componente
const { hideValues } = useHideValues();

// 3. Aplicar classe condicional aos valores
<span className={cn("...", hideValues && "blur-md select-none")}>
  {formatCurrency(value)}
</span>
```

---

## Resultado Esperado

Após a implementação:
- O toggle de privacidade no Dashboard afetará TODAS as páginas
- Valores financeiros em todo o app ficarão desfocados
- Estado persiste via `localStorage` (já implementado no contexto)
- Utilizadores podem apresentar ecrã sem expor dados sensíveis

---

## Secção Técnica

### Exemplo: Pagamentos.tsx

```typescript
// Importar hook (adicionar ao topo)
import { useHideValues } from '@/hooks/useHideValues';

// Dentro do componente
const { hideValues } = useHideValues();

// Modificar summary cards (linhas ~466-500)
<span className={cn(
  "text-2xl font-bold text-success",
  hideValues && "blur-md select-none"
)}>
  {formatCurrency(totalRevenueFromProjects.pending)}
</span>
```

### Componentes de Pagamentos

```typescript
// ProjectRevenueControl.tsx - linha 165
<span className={cn(
  "font-semibold text-warning",
  hideValues && "blur-md select-none"
)}>
  {formatCurrency(totalPending)}
</span>

// Linha 230
<TableCell className={cn(
  "text-right font-medium text-success",
  hideValues && "blur-md select-none"
)}>
  +{formatCurrency(project.agreed_value || 0)}
</TableCell>
```

### Estimativa de Alterações

| Ficheiro | Linhas a Modificar | Complexidade |
|----------|-------------------|--------------|
| Pagamentos.tsx | ~15 elementos | Média |
| Finalizados.tsx | ~10 elementos | Média |
| Relatorios.tsx | ~20 elementos | Alta |
| Faturacao.tsx | ~5 elementos | Baixa |
| ProjectRevenueControl.tsx | ~4 elementos | Baixa |
| FreelancerPaymentsControl.tsx | ~4 elementos | Baixa |
| ClientPaymentsControl.tsx | ~4 elementos | Baixa |
| ExtraCostsPaymentsControl.tsx | ~3 elementos | Baixa |
| ProjectFinancialTab.tsx | ~10 elementos | Média |
| LeadCard.tsx | ~1 elemento | Baixa |
