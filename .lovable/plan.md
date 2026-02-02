

# Plano: Secção de Previsão Financeira Simplificada

## Objectivo

Redesenhar a área de KPIs do Dashboard para mostrar uma única secção "Previsão Financeira" com layout:
1. **Linha 1**: 3 contadores de projectos (Em Captação, Em Edição, Entregues)
2. **Linha 2**: 3 cards de previsão financeira (Receita, Custo, Lucro) com selector de mês

---

## Layout Proposto

```text
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────────┐   ┌────────────┐   ┌────────────┐              │
│  │ 📷 3       │   │ 🎬 5       │   │ ✅ 2       │              │
│  │ Em Captação│   │ Em Edição  │   │ Entregues  │              │
│  └────────────┘   └────────────┘   └────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│ Previsão Financeira                    [< ] Fev 2026 [>] [Hoje]│
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Receita    │  │    Custo     │  │    Lucro     │          │
│  │  12.400 €    │  │   3.200 €    │  │   9.200 €    │          │
│  │  prevista    │  │  previsto    │  │  previsto    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## O Que Muda

| Elemento | Antes | Depois |
|----------|-------|--------|
| Contadores de projectos | Misturados com KPIs financeiros | **Linha própria no topo** |
| Cards financeiros (6) | Realizados + Previsão separados | **Apenas previsão com filtro de mês** |
| Selector de mês | Não existia | **Novo, permite navegar meses** |
| Layout | 6 cards numa grelha | **2 linhas: contadores + previsão** |

---

## Ficheiros a Criar/Modificar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/hooks/useMonthlyForecast.ts` | **Criar** | Hook para cálculo de previsão por mês |
| `src/components/dashboard/MonthPicker.tsx` | **Criar** | Selector de mês |
| `src/components/dashboard/ProjectCounters.tsx` | **Criar** | 3 cards de contagem |
| `src/components/dashboard/FinancialForecastCards.tsx` | **Criar** | 3 cards de previsão + header |
| `src/pages/app/Dashboard.tsx` | Modificar | Usar novos componentes |
| `src/components/dashboard/KPICards.tsx` | Manter backup | Pode ser removido depois |

---

## Componentes

### 1. ProjectCounters.tsx

Três cards com contagem actual de projectos:
- **Em Captação**: Ícone Camera, cor amarela/warning
- **Em Edição**: Ícone Film, cor azul/info  
- **Entregues (mês)**: Ícone CheckCircle2, cor verde/success

Usa dados do `useDashboardMetrics` existente (`metrics.captacao`, `metrics.edicao`, `metrics.entregues`).

### 2. FinancialForecastCards.tsx

Header com:
- Título "Previsão Financeira"
- MonthPicker (navegação de mês)

Três cards de previsão:
- **Receita Prevista**: Ícone Target, cor verde
- **Custo Previsto**: Ícone Calculator, cor laranja/warning
- **Lucro Previsto**: Ícone PiggyBank, cor roxa (ou vermelha se negativo)

### 3. MonthPicker.tsx

```text
[<] Fev 2026 [>] [Hoje]
```

- Botão `<` - mês anterior
- Display do mês: "Fev 2026" (formato pt-PT)
- Botão `>` - mês seguinte
- Botão "Hoje" - volta ao mês corrente (só aparece se não estiver no mês actual)

### 4. useMonthlyForecast.ts

Hook que calcula previsão para o mês seleccionado:

```typescript
function useMonthlyForecast(selectedMonth: Date) {
  return {
    totalRevenue: number,    // Σ agreed_value
    totalCost: number,       // Σ custos + pagamentos equipa
    totalProfit: number,     // revenue - cost
    projectCount: number,    // quantos projectos incluídos
    loading: boolean
  };
}
```

**Lógica de inclusão**:
- Projectos com `delivery_date` no mês seleccionado
- Fallback para `shoot_date` se não tiver `delivery_date`
- Projectos atrasados (`is_delivered = false` e data < mês) são incluídos via rollover

---

## Secção Técnica

### useMonthlyForecast.ts

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { format, parseISO } from 'date-fns';

export interface MonthlyForecastData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  projectCount: number;
  loading: boolean;
}

export function useMonthlyForecast(selectedMonth: Date): MonthlyForecastData {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<MonthlyForecastData>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    projectCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchForecast = async () => {
      setData(prev => ({ ...prev, loading: true }));
      
      const monthKey = format(selectedMonth, 'yyyy-MM');

      // Buscar projectos do workspace
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id, is_delivered, delivery_date, shoot_date,
          agreed_value, custo_captacao, custo_edicao, custos_extras
        `)
        .eq('workspace_id', currentWorkspace.id);

      let totalRevenue = 0;
      let totalCost = 0;
      let projectCount = 0;

      projects?.forEach(p => {
        // Determinar data âncora
        const anchorDate = p.delivery_date || p.shoot_date;
        if (!anchorDate) return;

        const projectMonth = format(parseISO(anchorDate), 'yyyy-MM');

        // Incluir se: mês coincide OU rollover (atrasado + não entregue)
        const isInMonth = projectMonth === monthKey;
        const isRollover = !p.is_delivered && projectMonth < monthKey;

        if (isInMonth || isRollover) {
          totalRevenue += p.agreed_value || 0;
          totalCost += (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0);
          projectCount++;
        }
      });

      // TODO: Adicionar pagamentos de equipa pendentes ao custo

      setData({
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        projectCount,
        loading: false,
      });
    };

    fetchForecast();
  }, [currentWorkspace?.id, selectedMonth]);

  return data;
}
```

### Dashboard.tsx - Alteração

```tsx
// Substituir <KPICards> por:
<ProjectCounters metrics={metrics} loading={loading} />

{!isCollaborator && canViewAllFinancials && (
  <FinancialForecastCards />
)}
```

---

## Permissões

- **Contadores de projectos**: Visíveis para todos os utilizadores
- **Cards de previsão financeira**: Apenas para utilizadores com `canViewAllFinancials`
- **hideValues**: Aplica blur nos valores financeiros quando activo

---

## Estilo Visual

- Contadores: Cards compactos com ícone + número grande + label
- Previsão: Cards maiores com valor destacado
- Cores:
  - Captação: Amarelo/Primary
  - Edição: Azul/Info
  - Entregues: Verde/Success
  - Receita: Verde/Success
  - Custo: Laranja/Warning
  - Lucro: Roxo/Primary (ou Vermelho se negativo)

