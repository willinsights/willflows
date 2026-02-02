

# Plano: Indicadores de Comparação Percentual (Mês Anterior)

## Objectivo

Adicionar indicadores de variação percentual em relação ao mês anterior em todos os cards do Dashboard (contadores de projectos e previsão financeira), seguindo o padrão visual já existente.

---

## Layout Visual

```text
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ 📷 3           │   │ 🎬 5           │   │ ✅ 2           │
│ ▲ +50%         │   │ ▼ -20%         │   │ ▼ -95%         │
│ Em Captação    │   │ Em Edição      │   │ Entregues      │
└────────────────┘   └────────────────┘   └────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ 🎯 12.400 €    │   │ 🧮 3.200 €     │   │ 🐷 9.200 €     │
│ ▲ +15%         │   │ ▼ -10%         │   │ ▲ +25%         │
│ Receita Prev.  │   │ Custo Previsto │   │ Lucro Previsto │
└────────────────┘   └────────────────┘   └────────────────┘
```

---

## O Que Será Alterado

| Componente | Estado Actual | Alteração |
|------------|---------------|-----------|
| `useMonthlyForecast.ts` | Calcula apenas mês seleccionado | Calcular também mês anterior + variações |
| `FinancialForecastCards.tsx` | Mostra apenas valores | Adicionar indicador % |
| `ProjectCounters.tsx` | Mostra apenas contagem | Adicionar indicador % (usando `metrics.entreguesChange`) |
| `useDashboardMetrics.ts` | Tem `entreguesChange` | Adicionar `captacaoChange` e `edicaoChange` |

---

## Componente ChangeIndicator

Reutilizar o padrão já existente em `KPICards.tsx`:

```tsx
function ChangeIndicator({ change, invertColor = false }) {
  if (change === null) return null;
  
  const isPositive = change >= 0;
  const showAsPositive = invertColor ? !isPositive : isPositive;
  
  return (
    <span className={cn(
      "text-[10px] flex items-center gap-0.5 mt-0.5",
      showAsPositive ? "text-success" : "text-destructive"
    )}>
      {isPositive ? <TrendingUp /> : <TrendingDown />}
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}
```

---

## Ficheiros a Modificar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/hooks/useMonthlyForecast.ts` | Modificar | Adicionar cálculo do mês anterior e variações |
| `src/components/dashboard/FinancialForecastCards.tsx` | Modificar | Mostrar indicadores de variação |
| `src/components/dashboard/ProjectCounters.tsx` | Modificar | Mostrar indicadores de variação |
| `src/components/ui/ChangeIndicator.tsx` | **Criar** | Componente reutilizável extraído do KPICards |

---

## Secção Técnica

### 1. Criar `src/components/ui/ChangeIndicator.tsx`

Extrair o componente `ChangeIndicator` de `KPICards.tsx` para um ficheiro reutilizável:

```typescript
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangeIndicatorProps {
  change: number | null;
  invertColor?: boolean; // Para custos, onde aumento é negativo
}

export function ChangeIndicator({ change, invertColor = false }: ChangeIndicatorProps) {
  if (change === null) return null;
  
  const isPositive = change >= 0;
  const showAsPositive = invertColor ? !isPositive : isPositive;
  
  return (
    <span className={cn(
      "text-[10px] flex items-center gap-0.5 mt-0.5",
      showAsPositive ? "text-success" : "text-destructive"
    )}>
      {isPositive ? (
        <TrendingUp className="h-2.5 w-2.5" />
      ) : (
        <TrendingDown className="h-2.5 w-2.5" />
      )}
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}
```

### 2. Actualizar `src/hooks/useMonthlyForecast.ts`

Calcular métricas para ambos os meses e retornar as variações:

```typescript
export interface MonthlyForecastData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  projectCount: number;
  // Novos campos de variação
  revenueChange: number | null;
  costChange: number | null;
  profitChange: number | null;
  loading: boolean;
}

// Na lógica de cálculo:
const monthKey = format(selectedMonth, 'yyyy-MM');
const previousMonthKey = format(subMonths(selectedMonth, 1), 'yyyy-MM');

// Calcular totais para ambos os meses
let totalRevenue = 0, totalCost = 0;
let prevRevenue = 0, prevCost = 0;

projects?.forEach(p => {
  const anchorDate = p.delivery_date || p.shoot_date;
  if (!anchorDate) return;
  const projectMonth = format(parseISO(anchorDate), 'yyyy-MM');
  
  // Mês seleccionado
  if (projectMonth === monthKey || (!p.is_delivered && projectMonth < monthKey)) {
    totalRevenue += p.agreed_value || 0;
    totalCost += (p.custo_captacao || 0) + ...;
  }
  
  // Mês anterior
  if (projectMonth === previousMonthKey || (!p.is_delivered && projectMonth < previousMonthKey)) {
    prevRevenue += p.agreed_value || 0;
    prevCost += ...;
  }
});

// Calcular variações
const calculateChange = (current, previous) => 
  previous === 0 ? null : Math.round(((current - previous) / Math.abs(previous)) * 100);

return {
  totalRevenue,
  totalCost,
  totalProfit: totalRevenue - totalCost,
  revenueChange: calculateChange(totalRevenue, prevRevenue),
  costChange: calculateChange(totalCost, prevCost),
  profitChange: calculateChange(totalRevenue - totalCost, prevRevenue - prevCost),
  ...
};
```

### 3. Actualizar `src/components/dashboard/FinancialForecastCards.tsx`

Adicionar o `ChangeIndicator` aos cards:

```tsx
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';

// No hook:
const { 
  totalRevenue, totalCost, totalProfit, 
  revenueChange, costChange, profitChange,  // Novos
  loading 
} = useMonthlyForecast(selectedMonth);

// Nos cards:
const forecastCards = [
  {
    label: 'Receita Prevista',
    value: formatCurrency(totalRevenue),
    change: revenueChange,
    invertColor: false,
    ...
  },
  {
    label: 'Custo Previsto',
    value: formatCurrency(totalCost),
    change: costChange,
    invertColor: true,  // Aumento de custo = vermelho
    ...
  },
  {
    label: 'Lucro Previsto',
    value: formatCurrency(totalProfit),
    change: profitChange,
    invertColor: false,
    ...
  },
];

// No render do card:
<div className="flex flex-col">
  <span className={cn('font-bold text-lg', card.valueClass)}>
    {card.value}
  </span>
  <ChangeIndicator change={card.change} invertColor={card.invertColor} />
</div>
```

### 4. Actualizar `src/components/dashboard/ProjectCounters.tsx`

Adicionar variações aos contadores de projectos:

```tsx
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';

interface ProjectCountersProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

// Usar entreguesChange existente no metrics
const counters = [
  {
    label: 'Em Captação',
    value: metrics.captacao,
    change: metrics.captacaoChange ?? null,  // Novo
    ...
  },
  {
    label: 'Em Edição',
    value: metrics.edicao,
    change: metrics.edicaoChange ?? null,  // Novo
    ...
  },
  {
    label: 'Entregues (mês)',
    value: metrics.entregues,
    change: metrics.entreguesChange,  // Já existe
    ...
  },
];

// No render:
<div className="flex flex-col">
  <span className="font-bold text-2xl">{counter.value}</span>
  <ChangeIndicator change={counter.change} />
</div>
```

### 5. Actualizar `src/hooks/useDashboardMetrics.ts`

Adicionar cálculo de variação para captação e edição (comparando com snapshot do mês anterior):

```typescript
// Adicionar aos campos retornados:
captacaoChange: number | null;
edicaoChange: number | null;

// Nota: Para captação/edição, a comparação é mais complexa pois são snapshots.
// Pode-se usar o histórico de project_phase_history ou simplesmente
// comparar projectos criados/movidos para essas fases no mês actual vs anterior.

// Alternativa mais simples: apenas mostrar variação para "Entregues" 
// (já implementado) e omitir para Captação/Edição por serem snapshots dinâmicos.
```

---

## Lógica de Cores

| Métrica | Positivo (+) | Negativo (-) |
|---------|--------------|--------------|
| Receita | 🟢 Verde | 🔴 Vermelho |
| Custo | 🔴 Vermelho (invertido) | 🟢 Verde (invertido) |
| Lucro | 🟢 Verde | 🔴 Vermelho |
| Entregues | 🟢 Verde | 🔴 Vermelho |
| Captação/Edição | Neutro ou omitir | Neutro ou omitir |

---

## Decisão: Captação e Edição

Os contadores de "Em Captação" e "Em Edição" são **snapshots actuais** do pipeline, não métricas acumuladas mensais. Existem duas opções:

1. **Não mostrar variação** - São estados instantâneos, não faz sentido comparar mês a mês
2. **Comparar volume** - Projectos que entraram na fase no mês actual vs mês anterior

**Recomendação:** Mostrar variação apenas em **"Entregues"** (que já tem `entreguesChange`), pois é a única métrica acumulativa. Os outros dois cards podem ficar sem indicador de variação.

---

## Resumo das Alterações

1. **Criar** `ChangeIndicator.tsx` - Componente reutilizável
2. **Modificar** `useMonthlyForecast.ts` - Calcular mês anterior + variações
3. **Modificar** `FinancialForecastCards.tsx` - Mostrar indicadores
4. **Modificar** `ProjectCounters.tsx` - Mostrar indicador em "Entregues"
5. **Opcional** `useDashboardMetrics.ts` - Adicionar variações de captação/edição

