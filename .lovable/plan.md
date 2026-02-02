
# Plano: Actualizar Relatórios com Correcção de Custos

## Contexto

A correcção feita no `useMonthlyForecast.ts` estabeleceu que os campos do projecto (`custo_captacao`, `custo_edicao`, `custos_extras`) são a **fonte de verdade** para custos. Não se deve adicionar separadamente os `project_team.payment_amount` porque esses valores já estão agregados nos campos do projecto.

No entanto, outros relatórios e hooks ainda usam lógica inconsistente:
- Alguns somam `project_team.payment_amount` aos custos (duplicação)
- Outros fazem queries desnecessárias a `project_team`

---

## Ficheiros Afectados

| Ficheiro | Problema | Correcção |
|----------|----------|-----------|
| `src/hooks/useDashboardMetrics.ts` | Linha 329 e 443: soma `teamPaymentsPending` aos custos de previsão | Remover soma duplicada |
| `src/pages/app/Relatorios.tsx` | Linhas 155-175, 312-353, 406-433: usa `project_team.payment_amount` para custos | Usar campos do projecto |
| `src/pages/app/Finalizados.tsx` | Linhas 237, 273-278, 361: já usa campos corretos | Manter (está correcto) |
| `src/components/dashboard/FinancialChart.tsx` | Recebe dados do `useDashboardMetrics` | Corrigido automaticamente |
| `src/components/mobile/MobileFinancialSummary.tsx` | Recebe dados do `useDashboardMetrics` | Corrigido automaticamente |

---

## Correcções Detalhadas

### 1. `useDashboardMetrics.ts` - Linha 329

**Problema:**
```typescript
// Linha 329
const previsaoCustos = previsaoCustosProjeto + teamPaymentsPending;
```

O hook calcula `previsaoCustosProjeto` correctamente (soma de `custo_captacao + custo_edicao + custos_extras`), mas depois adiciona TODOS os pagamentos pendentes da equipa do workspace. Isto duplica custos.

**Correcção:**
```typescript
// Remover a soma de teamPaymentsPending
const previsaoCustos = previsaoCustosProjeto;
```

**Impacto:** Também remover a query `pendingTeamPaymentsData` (linhas 318-327) se não for usada noutro local.

### 2. `useDashboardMetrics.ts` - Linha 443

**Problema:**
```typescript
// Linha 443
custosPrevisao += teamPaymentsPending;
```

No cálculo de `monthlyData` para o gráfico, adiciona-se novamente os pagamentos pendentes da equipa aos custos de previsão.

**Correcção:**
```typescript
// Remover esta linha
// custosPrevisao += teamPaymentsPending;
```

### 3. `Relatorios.tsx` - Lógica de Custos (Linhas 155-175)

**Problema:**
```typescript
// Fetch team payments data for accurate cost calculations
const [teamPaymentsData, setTeamPaymentsData] = useState<...>([]);

useEffect(() => {
  const fetchTeamPayments = async () => {
    // ... busca project_team.payment_amount
  };
  fetchTeamPayments();
}, [projects]);
```

O componente faz uma query separada a `project_team` para obter pagamentos, e depois usa-os para calcular custos.

**Correcção:**
Remover esta query e usar directamente os campos do projecto (`custo_captacao + custo_edicao + custos_extras`).

### 4. `Relatorios.tsx` - `monthlyData` (Linhas 312-353)

**Problema:**
```typescript
// Calculate costs from project_team.payment_amount (source of truth)
const teamCosts = teamPaymentsData
  .filter(tp => monthProjectIds.includes(tp.project_id))
  .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);

const extraCosts = monthProjects.reduce((sum, p) => sum + (p.custos_extras || 0), 0);
const costs = teamCosts + extraCosts;
```

**Correcção:**
```typescript
// Use project cost fields as source of truth
const costs = monthProjects.reduce((sum, p) => 
  sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
```

### 5. `Relatorios.tsx` - `summaryMetrics` (Linhas 406-433)

**Problema:**
```typescript
// Team costs from project_team.payment_amount (source of truth)
const totalTeamCosts = teamPaymentsData
  .filter(tp => deliveredProjectIds.includes(tp.project_id))
  .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0);

const totalExtraCosts = deliveredProjects.reduce((sum, p) => sum + (p.custos_extras || 0), 0);
const totalCosts = totalTeamCosts + totalExtraCosts;
```

**Correcção:**
```typescript
// Use project cost fields as source of truth
const totalCosts = deliveredProjects.reduce((sum, p) => 
  sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
```

---

## Resumo das Alterações por Ficheiro

### `src/hooks/useDashboardMetrics.ts`

| Linha | Acção |
|-------|-------|
| 318-327 | **Remover** query `pendingTeamPaymentsData` (já não é necessária) |
| 329 | Alterar: `previsaoCustos = previsaoCustosProjeto` (sem `+ teamPaymentsPending`) |
| 443 | **Remover** linha: `custosPrevisao += teamPaymentsPending` |

### `src/pages/app/Relatorios.tsx`

| Linha | Acção |
|-------|-------|
| 106-111 | **Remover** state `teamPaymentsData` |
| 155-175 | **Remover** `useEffect` que faz fetch de `project_team` |
| 312-353 | Reescrever `monthlyData` para usar campos do projecto |
| 406-433 | Reescrever `summaryMetrics` para usar campos do projecto |

---

## Verificação de Finalizados.tsx

O ficheiro `Finalizados.tsx` já usa a lógica correcta:

```typescript
// Linha 237
const custo = (project.custo_captacao || 0) + (project.custo_edicao || 0) + (project.custos_extras || 0);
```

Não é necessária nenhuma alteração.

---

## Impacto Visual

Após estas correcções:

| Relatório | Antes | Depois |
|-----------|-------|--------|
| Dashboard Previsão | Custos inflacionados | Custos correctos |
| Gráfico Financeiro | Previsão com custos duplicados | Previsão alinhada |
| Relatórios → Evolução Mensal | Custos de `project_team` | Custos do projecto |
| Relatórios → Resumo | Custos de `project_team` | Custos do projecto |

---

## Secção Técnica

### useDashboardMetrics.ts - Código Corrigido

```typescript
// REMOVER linhas 318-327 (query pendingTeamPaymentsData)

// Linha 329 - ALTERAR de:
const previsaoCustos = previsaoCustosProjeto + teamPaymentsPending;
// PARA:
const previsaoCustos = previsaoCustosProjeto;

// REMOVER linha 443:
// custosPrevisao += teamPaymentsPending;
```

### Relatorios.tsx - Código Corrigido

```typescript
// REMOVER state teamPaymentsData (linhas 106-111)
// REMOVER useEffect fetchTeamPayments (linhas 155-175)

// monthlyData - SIMPLIFICAR para:
const monthlyData = useMemo(() => {
  const months = [];
  
  for (let i = periodMonths - 1; i >= 0; i--) {
    const date = subMonths(dateRange.end, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    if (end < dateRange.start) continue;
    
    const monthProjects = projects.filter(p => {
      if (!p.is_delivered || !p.delivered_at) return false;
      const delivered = new Date(p.delivered_at);
      return isWithinInterval(delivered, { start, end });
    });
    
    const revenue = monthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    
    // Use project cost fields as source of truth
    const costs = monthProjects.reduce((sum, p) => 
      sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
    
    months.push({
      month: format(date, 'MMM yy', { locale: pt }),
      fullMonth: format(date, 'MMMM yyyy', { locale: pt }),
      receita: revenue,
      custos: costs,
      lucro: revenue - costs,
      margin: revenue > 0 ? ((revenue - costs) / revenue * 100) : 0,
      projetos: monthProjects.length,
    });
  }
  
  return months;
}, [projects, dateRange, periodMonths]);  // Remove teamPaymentsData dependency

// summaryMetrics - SIMPLIFICAR para:
const summaryMetrics = useMemo(() => {
  const deliveredProjects = projects.filter(p => p.is_delivered);
  
  const totalRevenue = deliveredProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
  
  // Use project cost fields as source of truth
  const totalCosts = deliveredProjects.reduce((sum, p) => 
    sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
  
  const avgProjectValue = deliveredProjects.length > 0 ? totalRevenue / deliveredProjects.length : 0;
  
  return {
    totalRevenue,
    totalCosts,
    profit: totalRevenue - totalCosts,
    margin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100) : 0,
    avgProjectValue,
    totalProjects: projects.length,
    deliveredProjects: deliveredProjects.length,
    activeClients: clients.filter(c => c.is_active).length,
  };
}, [projects, clients]);  // Remove teamPaymentsData dependency
```

---

## Componentes que Não Precisam de Alteração

- **FinancialChart.tsx**: Recebe dados do `useDashboardMetrics`, será corrigido automaticamente
- **MobileFinancialSummary.tsx**: Recebe dados do `useDashboardMetrics`, será corrigido automaticamente
- **Finalizados.tsx**: Já usa lógica correcta
- **useMonthlyForecast.ts**: Já foi corrigido

---

## Ficheiros a Modificar

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useDashboardMetrics.ts` | Remover query e somas duplicadas |
| `src/pages/app/Relatorios.tsx` | Remover query e simplificar cálculos |
