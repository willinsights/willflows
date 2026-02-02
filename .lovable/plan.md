
# Plano: Corrigir Cálculo de Métricas Financeiras (Receita/Custos/Lucro)

## Problema Identificado

Os KPIs de **Receita**, **Custos** e **Lucro** no dashboard estão a usar a data de **criação** (`created_at`) em vez da data de **entrega** (`delivered_at`) para filtrar projectos.

| Métrica | Filtro Actual | Filtro Correcto |
|---------|---------------|-----------------|
| Entregues | `delivered_at` ✅ | `delivered_at` |
| Receita | `created_at` ❌ | `delivered_at` |
| Custos | `created_at` ❌ | `delivered_at` |
| Lucro | `created_at` ❌ | `delivered_at` |

### Impacto
Os 100€ de receita/custos que vês referem-se a projectos **criados** em Janeiro, não **entregues** em Janeiro. Ao corrigir, o dashboard irá:
- Mostrar 0€ de receita/custos para Fevereiro (se nenhum projecto foi entregue ainda)
- Mostrar os valores correctos para Janeiro (projectos entregues nesse mês)

---

## Alteração Necessária

### Ficheiro: `src/hooks/useDashboardMetrics.ts`

Alterar o filtro de `created_at` para `delivered_at` apenas para projectos **entregues**:

```typescript
// ANTES (linhas 185-193)
const currentMonthProjects = projectsData?.filter(p => {
  const createdAt = new Date(p.created_at);
  return createdAt >= currentMonthStart && createdAt <= currentMonthEnd;
}) || [];

// DEPOIS
const currentMonthProjects = projectsData?.filter(p => {
  // Only count DELIVERED projects for financial metrics
  if (!p.is_delivered || !p.delivered_at) return false;
  const deliveredAt = new Date(p.delivered_at);
  return deliveredAt >= currentMonthStart && deliveredAt <= currentMonthEnd;
}) || [];
```

Aplicar a mesma correção para o mês anterior (linhas 196-199):

```typescript
// DEPOIS
const previousMonthProjects = projectsData?.filter(p => {
  if (!p.is_delivered || !p.delivered_at) return false;
  const deliveredAt = new Date(p.delivered_at);
  return deliveredAt >= previousMonthStart && deliveredAt <= previousMonthEnd;
}) || [];
```

---

## Lógica de Negócio

A receita/custos só devem ser contabilizados quando o projecto é **efectivamente entregue**, não quando é criado:

- **Projectos em andamento** → contribuem para **Previsão** (já funciona assim)
- **Projectos entregues** → contribuem para **Receita/Custos/Lucro do mês**

---

## Secção Técnica

### Código Actual (Incorrecto)

```typescript
// Lines 185-193 - Uses created_at
const currentMonthProjects = projectsData?.filter(p => {
  const createdAt = new Date(p.created_at);
  return createdAt >= currentMonthStart && createdAt <= currentMonthEnd;
}) || [];

const receita = currentMonthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
```

### Código Corrigido

```typescript
// Lines 185-193 - Uses delivered_at for DELIVERED projects only
const currentMonthProjects = projectsData?.filter(p => {
  if (!p.is_delivered || !p.delivered_at) return false;
  const deliveredAt = new Date(p.delivered_at);
  return deliveredAt >= currentMonthStart && deliveredAt <= currentMonthEnd;
}) || [];

const receita = currentMonthProjects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
```

### Também corrigir mês anterior (para comparação %)

```typescript
// Lines 196-204
const previousMonthProjects = projectsData?.filter(p => {
  if (!p.is_delivered || !p.delivered_at) return false;
  const deliveredAt = new Date(p.delivered_at);
  return deliveredAt >= previousMonthStart && deliveredAt <= previousMonthEnd;
}) || [];
```

---

## Resultado Esperado

Após a correção:
- **Fevereiro**: 0€ receita (nenhum projecto entregue ainda)
- **Janeiro**: Valores correctos dos projectos entregues com `delivered_at` em Janeiro
- Os projectos que acabaste de marcar como entregues com data 31/Jan irão contar para Janeiro

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useDashboardMetrics.ts` | Corrigir filtro de `created_at` para `delivered_at` nas linhas ~185-204 |

