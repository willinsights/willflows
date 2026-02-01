
# Plano: Previsão Financeira com Rollover Automático

## Resumo

Implementar previsão financeira inteligente no Dashboard e na página de Pagamentos que:
1. Calcula **previsão de receita, custos e lucro** baseada em projetos activos nos Kanbans
2. Projetos não entregues passam **automaticamente** para o mês seguinte (rollover)
3. Adiciona **lucro previsto por mês** na página Pagamentos/Previsão

---

## Lógica de Rollover

```text
Janeiro (Previsão: €10.000)
├── Projeto A: €5.000 → Entregue ✓ (Receita Realizada)
└── Projeto B: €5.000 → Não entregue ✗

Fevereiro (Rollover Automático)
└── Projeto B: €5.000 → Contribui para previsão de Fevereiro
```

**Regra:** Projetos com `is_delivered = false` contribuem para a previsão do mês actual, independentemente da `delivery_date` original.

---

## Alterações

### 1. `src/hooks/useDashboardMetrics.ts`

Adicionar novas métricas de previsão ao interface e cálculo:

```typescript
// Novas propriedades no DashboardMetrics
previsaoReceita: number;   // Soma de agreed_value de projetos não entregues
previsaoCustos: number;    // Soma de custos de projetos não entregues + pagamentos equipa pendentes
previsaoLucro: number;     // previsaoReceita - previsaoCustos
previsaoMargemPercent: number;
projetosAtivos: number;    // Contagem de projetos contribuindo
```

**Lógica de cálculo:**
- Filtrar projetos onde `is_delivered = false`
- Se `delivery_date` já passou ou é no mês actual, conta para previsão
- Buscar também pagamentos de equipa pendentes (`project_team` com `payment_status !== 'pago'`)

### 2. `src/components/dashboard/KPICards.tsx`

Adicionar 3 novos cards de previsão após os KPIs existentes (apenas para admins):

| Card | Valor | Ícone |
|------|-------|-------|
| Prev. Receita | `previsaoReceita` | Target (azul) |
| Prev. Custos | `previsaoCustos` | Calculator (laranja) |
| Prev. Lucro | `previsaoLucro` | PiggyBank (verde/vermelho) |

Visual:
```text
┌─────────────────────────────────────────────────────────────────┐
│ Em Captação │ Em Edição │ Entregues │ Receita │ Custos │ Lucro  │
├─────────────────────────────────────────────────────────────────┤
│ PREVISÃO                                                        │
│ Prev. Receita │ Prev. Custos │ Prev. Lucro                      │
│    €25.450    │    €8.200    │   €17.250                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3. `src/pages/app/Pagamentos.tsx`

Adicionar card de **Lucro Previsto** no resumo financeiro mensal (linha 551-606):

```tsx
{/* Lucro Previsto - NOVO */}
<Card className="glass-card border-primary/20">
  <CardContent className="p-4 text-center">
    <p className="text-xs text-muted-foreground mb-1">Lucro Previsto</p>
    <p className={cn('text-2xl font-bold', lucroPrevisto >= 0 ? 'text-primary' : 'text-destructive')}>
      {formatCurrency(lucroPrevisto)}
    </p>
    <p className="text-[10px] text-muted-foreground/70 mt-1">
      Margem: {margemPercent}%
    </p>
  </CardContent>
</Card>
```

**Cálculo:** `lucroPrevisto = pendingReceivable - totalPayable`

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useDashboardMetrics.ts` | Interface + cálculo de previsão |
| `src/components/dashboard/KPICards.tsx` | 3 novos cards de previsão |
| `src/pages/app/Pagamentos.tsx` | Card de lucro no resumo mensal |
| `src/components/mobile/MobileKPICarousel.tsx` | Slides de previsão (opcional) |

---

## Secção Técnica

### Cálculo de Previsão (useDashboardMetrics.ts)

```typescript
// Projetos que contribuem para previsão = não entregues
const previsaoProjects = projectsData?.filter(p => {
  if (p.is_delivered) return false;
  
  // Sem data = conta para mês actual
  if (!p.delivery_date) return true;
  
  const deliveryDate = new Date(p.delivery_date);
  // Se data já passou e não foi entregue, conta para mês actual (rollover)
  if (deliveryDate < currentMonthEnd) return true;
  
  // Se está no mês actual, conta
  return isWithinInterval(deliveryDate, { start: currentMonthStart, end: currentMonthEnd });
}) || [];

// Receita prevista
const previsaoReceita = previsaoProjects.reduce(
  (sum, p) => sum + (p.agreed_value || 0), 0
);

// Custos previstos (custos do projeto + pagamentos equipa pendentes)
const previsaoCustosProjeto = previsaoProjects.reduce(
  (sum, p) => sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0
);

// Buscar pagamentos de equipa pendentes
const { data: pendingTeamPayments } = await supabase
  .from('project_team')
  .select('payment_amount, projects!inner(workspace_id)')
  .eq('projects.workspace_id', currentWorkspace.id)
  .neq('payment_status', 'pago');

const teamPaymentsPending = pendingTeamPayments?.reduce(
  (sum, tp) => sum + (tp.payment_amount || 0), 0
) || 0;

const previsaoCustos = previsaoCustosProjeto + teamPaymentsPending;
const previsaoLucro = previsaoReceita - previsaoCustos;
const previsaoMargemPercent = previsaoReceita > 0 
  ? Math.round((previsaoLucro / previsaoReceita) * 100) 
  : 0;
```

### Reset de Estado (workspace change)

Adicionar as novas métricas ao reset:

```typescript
previsaoReceita: 0,
previsaoCustos: 0,
previsaoLucro: 0,
previsaoMargemPercent: 0,
projetosAtivos: 0,
```
