

# Plano: Corrigir Cálculo de Custos na Previsão Financeira

## Problema Identificado

Os custos do mês de Janeiro (e de qualquer mês) estão **inflacionados** devido a dois erros na lógica do hook `useMonthlyForecast.ts`:

### 1. Duplicação de Custos
Os campos `custo_captacao`, `custo_edicao` e `custos_extras` do projecto já representam os custos totais (que são distribuídos pelos membros da equipa em `project_team.payment_amount`). O hook está a somar **ambos**:
- Custos do projecto: 3.539,90€
- Pagamentos de equipa pendentes: 5.879,90€
- **Total errado: 9.419,80€**

Na realidade, estes valores representam a mesma coisa - os custos de captação e edição são agregados dos pagamentos individuais da equipa.

### 2. Pagamentos Não Filtrados por Mês
O hook está a buscar **TODOS** os pagamentos pendentes do workspace (5.879,90€), incluindo:
- Pagamentos de projectos de Fevereiro
- Pagamentos de projectos de meses futuros
- Pagamentos atrasados de meses passados

Todos estes valores são adicionados ao custo de Janeiro, quando deveria incluir apenas os pagamentos dos projectos que pertencem a Janeiro.

---

## Solução Proposta

Usar apenas os campos de custo do projecto (`custo_captacao + custo_edicao + custos_extras`) como fonte de verdade, **removendo** a soma adicional de pagamentos de equipa pendentes.

Os campos do projecto já representam o custo total agregado, portanto não há necessidade de somar os pagamentos individuais da equipa.

---

## Alterações Necessárias

### Ficheiro: `src/hooks/useMonthlyForecast.ts`

**Remover** a lógica que adiciona pagamentos de equipa pendentes:

**Antes (linhas 55-64 e 103-106):**
```typescript
// Fetch pending team payments for the month
const { data: teamPayments } = await supabase
  .from('project_team')
  .select(`
    payment_amount,
    payment_status,
    projects!inner(workspace_id)
  `)
  .eq('projects.workspace_id', currentWorkspace.id)
  .eq('payment_status', 'pendente');

// ...

// Add pending team payments to costs (both months use the same pending payments)
const pendingTeamCosts = teamPayments?.reduce((sum, tp) => sum + (tp.payment_amount || 0), 0) || 0;
totalCost += pendingTeamCosts;
prevCost += pendingTeamCosts;
```

**Depois:**
```typescript
// Removed: team payments query and addition to costs
// The project cost fields (custo_captacao, custo_edicao, custos_extras)
// already represent the total costs including team payments
```

---

## Resultado Esperado

Para Janeiro 2026 no workspace In-Sights:

| Métrica | Valor Actual (Errado) | Valor Correcto |
|---------|----------------------|----------------|
| Receita Prevista | 6.823,90€ | 6.823,90€ |
| Custo Previsto | 9.419,80€ | **3.539,90€** |
| Lucro Previsto | -2.595,90€ | **3.284,00€** |

---

## Secção Técnica

### Código Corrigido para `useMonthlyForecast.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { format, parseISO, subMonths } from 'date-fns';

export interface MonthlyForecastData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  projectCount: number;
  revenueChange: number | null;
  costChange: number | null;
  profitChange: number | null;
  loading: boolean;
}

function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function useMonthlyForecast(selectedMonth: Date): MonthlyForecastData {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<MonthlyForecastData>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    projectCount: 0,
    revenueChange: null,
    costChange: null,
    profitChange: null,
    loading: true,
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchForecast = async () => {
      setData(prev => ({ ...prev, loading: true }));
      
      const monthKey = format(selectedMonth, 'yyyy-MM');
      const previousMonth = subMonths(selectedMonth, 1);
      const previousMonthKey = format(previousMonth, 'yyyy-MM');

      // Fetch projects from workspace
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id, is_delivered, delivery_date, shoot_date,
          agreed_value, custo_captacao, custo_edicao, custos_extras
        `)
        .eq('workspace_id', currentWorkspace.id);

      // Calculate totals for selected month
      let totalRevenue = 0;
      let totalCost = 0;
      let projectCount = 0;

      // Calculate totals for previous month
      let prevRevenue = 0;
      let prevCost = 0;

      projects?.forEach(p => {
        // Determine anchor date (delivery_date or fallback to shoot_date)
        const anchorDate = p.delivery_date || p.shoot_date;
        if (!anchorDate) return;

        const projectMonth = format(parseISO(anchorDate), 'yyyy-MM');
        
        // Project costs = custo_captacao + custo_edicao + custos_extras
        // These fields already represent the total costs (including team payments)
        const projectCosts = (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);

        // Include in selected month if: month matches OR rollover (delayed + not delivered)
        const isInMonth = projectMonth === monthKey;
        const isRollover = !p.is_delivered && projectMonth < monthKey;

        if (isInMonth || isRollover) {
          totalRevenue += p.agreed_value || 0;
          totalCost += projectCosts;
          projectCount++;
        }

        // Include in previous month if: month matches OR rollover
        const isInPrevMonth = projectMonth === previousMonthKey;
        const isPrevRollover = !p.is_delivered && projectMonth < previousMonthKey;

        if (isInPrevMonth || isPrevRollover) {
          prevRevenue += p.agreed_value || 0;
          prevCost += projectCosts;
        }
      });

      // NOTE: Team payments (project_team.payment_amount) are NOT added separately
      // because custo_captacao and custo_edicao already represent these costs

      const totalProfit = totalRevenue - totalCost;
      const prevProfit = prevRevenue - prevCost;

      setData({
        totalRevenue,
        totalCost,
        totalProfit,
        projectCount,
        revenueChange: calculateChange(totalRevenue, prevRevenue),
        costChange: calculateChange(totalCost, prevCost),
        profitChange: calculateChange(totalProfit, prevProfit),
        loading: false,
      });
    };

    fetchForecast();
  }, [currentWorkspace?.id, selectedMonth]);

  return data;
}
```

---

## Resumo das Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useMonthlyForecast.ts` | Remover query de `project_team` e lógica de soma de pagamentos pendentes |

**Linhas a remover:** 55-64 (query de teamPayments) e 103-106 (soma de pendingTeamCosts)

