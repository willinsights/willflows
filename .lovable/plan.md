
# Plano: Gráfico de Evolução Financeira com Previsão

## Objectivo

Actualizar o gráfico de Evolução Financeira para incluir a **previsão do mês actual** baseada em projectos não finalizados, aplicando a mesma lógica de rollover implementada nos KPIs.

---

## Estado Actual

O gráfico mostra apenas **receita realizada** (projectos com `is_delivered = true`):

```text
Jan  Fev  Mar  Abr  Mai  Jun
 │    │    │    │    │    │
 ▼    ▼    ▼    ▼    ▼    ▼
€5k  €8k  €6k  €10k €7k  €3k  ← Apenas entregues
```

## Novo Comportamento

O mês actual inclui também a **previsão** (projectos activos não entregues):

```text
Jan  Fev  Mar  Abr  Mai  Jun (actual)
 │    │    │    │    │    │
 ▼    ▼    ▼    ▼    ▼    ▼
€5k  €8k  €6k  €10k €7k  €3k realizado + €12k previsão
                          │
                          └─ Barra/área adicional mostrando previsão
```

---

## Alterações

### 1. `src/hooks/useDashboardMetrics.ts`

Actualizar a interface `MonthlyData` e o cálculo:

```typescript
export interface MonthlyData {
  month: string;
  receita: number;      // Receita realizada (entregue)
  custos: number;       // Custos realizados
  lucro: number;        // Lucro realizado
  // NOVOS campos para previsão
  receitaPrevisao?: number;  // Receita prevista (não entregues)
  custosPrevisao?: number;   // Custos previstos
  lucroPrevisao?: number;    // Lucro previsto
}
```

**Lógica para mês actual:**

```typescript
// No loop de cálculo mensal (linhas 398-420)
for (let i = 5; i >= 0; i--) {
  const monthDate = subMonths(now, i);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const isCurrentMonth = i === 0;
  
  // Projectos ENTREGUES no mês (realizado)
  const deliveredProjects = projectsData?.filter(p => {
    if (!p.is_delivered || !p.delivered_at) return false;
    const deliveredAt = new Date(p.delivered_at);
    return deliveredAt >= monthStart && deliveredAt <= monthEnd;
  }) || [];
  
  const monthReceita = deliveredProjects.reduce(...);
  const monthCustos = deliveredProjects.reduce(...);
  
  // PREVISÃO: Apenas para mês actual
  let receitaPrevisao = 0;
  let custosPrevisao = 0;
  
  if (isCurrentMonth) {
    // Projectos NÃO entregues (rollover automático)
    const activeProjects = projectsData?.filter(p => {
      if (p.is_delivered) return false;
      if (!p.delivery_date) return true;
      const deliveryDate = new Date(p.delivery_date);
      return deliveryDate < monthEnd; // Rollover
    }) || [];
    
    receitaPrevisao = activeProjects.reduce(
      (sum, p) => sum + (p.agreed_value || 0), 0
    );
    custosPrevisao = activeProjects.reduce(
      (sum, p) => sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0
    );
  }
  
  monthlyStats.push({
    month: format(monthDate, 'MMM', { locale: pt }),
    receita: monthReceita,
    custos: monthCustos,
    lucro: monthReceita - monthCustos,
    receitaPrevisao: isCurrentMonth ? receitaPrevisao : undefined,
    custosPrevisao: isCurrentMonth ? custosPrevisao : undefined,
    lucroPrevisao: isCurrentMonth ? (receitaPrevisao - custosPrevisao) : undefined,
  });
}
```

### 2. `src/components/dashboard/FinancialChart.tsx`

Adicionar áreas tracejadas para previsão no mês actual:

```typescript
// Novos gradientes para previsão
<linearGradient id="colorReceitaPrevisao" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.15}/>
  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
</linearGradient>

// Nova área para previsão de receita (tracejada)
<Area
  type="monotone"
  dataKey="receitaPrevisao"
  name="Prev. Receita"
  stroke="hsl(var(--success))"
  strokeWidth={1.5}
  strokeDasharray="4 4"  // Linha tracejada
  fillOpacity={1}
  fill="url(#colorReceitaPrevisao)"
/>
```

**Alternativa visual (stacked):**

Em vez de áreas separadas, empilhar realizado + previsão:

```text
┌─────────────────────────────────────────────────┐
│                                    ░░░░░░░░░░░  │ ← Previsão (padrão tracejado)
│                              ████████████████   │ ← Realizado (sólido)
│         ▄▄▄▄▄▄▄▄▄▄▄▄        █████████████████   │
│    ▄▄▄▄████████████████▄▄▄▄██████████████████   │
│ ▄▄█████████████████████████████████████████████ │
├─────────────────────────────────────────────────┤
│ Jan  Fev  Mar  Abr  Mai  Jun                    │
└─────────────────────────────────────────────────┘
```

### 3. `src/components/mobile/MobileFinancialSummary.tsx`

Actualizar para mostrar também previsão no último mês:

```typescript
// Mostrar previsão no preview colapsado
const currentMonthData = monthlyData[monthlyData.length - 1];

// Se tiver previsão, mostrar
{currentMonthData?.receitaPrevisao && (
  <div>
    <p className="text-xs text-muted-foreground">+ Previsão</p>
    <p className="text-sm font-medium text-info">
      {formatCurrency(currentMonthData.receitaPrevisao)}
    </p>
  </div>
)}
```

---

## Visual Final

### Gráfico Desktop

```text
┌───────────────────────────────────────────────────────────────┐
│  📊 Evolução Financeira                    [6 Meses] [Anual]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  €30k ┤                                                       │
│       │                                    ░░░░░░░░░░░░░░░    │
│  €20k ┤         ████                       ████████████████   │
│       │    ████ ████ ████             ████ ████████████████   │
│  €10k ┤████████ ████ ████ ████   ████ ████ ████████████████   │
│       │████████ ████ ████ ████   ████ ████ ████████████████   │
│    €0 ┼────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴──   │
│       Jan  Fev  Mar  Abr  Mai  Jun  Jul  Ago  Set  Out  Nov   │
│                                                      │        │
│  ● Receita  ● Custos  ● Lucro  ○ Previsão ─ ─ ─     └──────── │
│                                                      Mês      │
│                                                      Actual   │
└───────────────────────────────────────────────────────────────┘
```

### Legenda

- **Cores sólidas:** Valores realizados (projectos entregues)
- **Padrão tracejado (░):** Previsão do mês actual (projectos activos)

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useDashboardMetrics.ts` | Interface MonthlyData + cálculo previsão mensal |
| `src/components/dashboard/FinancialChart.tsx` | Áreas tracejadas para previsão |
| `src/components/mobile/MobileFinancialSummary.tsx` | Mostrar previsão no resumo |

---

## Secção Técnica

### Interface Actualizada

```typescript
export interface MonthlyData {
  month: string;
  receita: number;
  custos: number;
  lucro: number;
  // Previsão (apenas mês actual)
  receitaPrevisao?: number;
  custosPrevisao?: number;
  lucroPrevisao?: number;
}
```

### Tooltip Personalizado

Para distinguir realizado de previsto no tooltip:

```typescript
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  
  return (
    <div className="bg-card border rounded-lg p-2 shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(entry => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
          {entry.name.includes('Prev') && ' (previsto)'}
        </p>
      ))}
    </div>
  );
};
```

### Dados Combinados para Visualização

Para mostrar realizado + previsão empilhados:

```typescript
// Dados transformados para stacked chart
const chartData = monthlyData.map(d => ({
  ...d,
  // Total = realizado + previsão (para altura da barra)
  receitaTotal: d.receita + (d.receitaPrevisao || 0),
  lucroTotal: d.lucro + (d.lucroPrevisao || 0),
}));
```
