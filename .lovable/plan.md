

# Reestruturar Motor Financeiro: Realizado / Previsao / Caixa

## Resumo

Criar um motor financeiro unificado (`financialEngine`) que elimina discrepancias entre componentes do dashboard e da pagina de pagamentos. Adicionar 3 modos de visualizacao (Realizado, Previsao, Caixa) com seletor global, resumo mensal consolidado, e migracoes DB para suportar cashflow (`paid_at`).

---

## Fase 1 -- Migracao de Base de Dados

Adicionar colunas necessarias para o modo Caixa:

- `project_team.paid_at` (timestamptz, nullable) -- registo de quando o colaborador foi pago
- `projects.custos_extras_paid_at` (timestamptz, nullable) -- registo de quando custos extras foram pagos
- Trigger/funcao para auto-preencher `paid_at` ao marcar `payment_status = 'pago'` e limpar ao desmarcar (project_team)
- Trigger/funcao para auto-preencher `custos_extras_paid_at` ao marcar `custos_extras_payment_status = 'pago'` e limpar (projects)
- Trigger para garantir consistencia de `client_paid_at` ja existente

---

## Fase 2 -- Motor Financeiro Unificado

Criar `src/lib/finance/financialEngine.ts` com:

### Funcoes exportadas:

1. **`getMonthlyMetrics(projects, viewMode, month)`** -- calculo puro (sem fetch, recebe dados)
   - viewMode `REALIZADO`: filtra por `delivered_at` no mes
   - viewMode `PREVISAO`: filtra por `delivery_date` (fallback `shoot_date`) + rollover (nao entregues de meses anteriores)
   - viewMode `CAIXA`: filtra por `paid_at` / `client_paid_at` / `custos_extras_paid_at`
   - Retorna: `{ revenue, cost, profit, breakdown, counts }`

2. **`getTimeSeries(projects, viewMode, fromMonth, toMonth)`** -- array mensal para graficos

3. **`getMonthlySummary(projects, month)`** -- 5 metricas consolidadas:
   - Criados no mes (`created_at`)
   - Planeados para o mes (`delivery_date`)
   - Entregues no mes (`delivered_at`)
   - Adiados (`delivery_date` no mes + nao entregue no fim do mes)
   - Resgatados (`delivery_date` antes do mes + `delivered_at` no mes)

### Regras de custo:
- Custo agregado = `custo_captacao + custo_edicao + custos_extras` (fonte de verdade, sem duplicacao com `project_team`)
- Modo CAIXA usa `project_team.paid_at` para saidas de equipa e `custos_extras_paid_at` para extras (fluxo real)

---

## Fase 3 -- Hook Unificado

Criar `src/hooks/useFinancialEngine.ts`:
- Fetch de dados do Supabase (projects + project_team quando modo CAIXA)
- Chama funcoes do `financialEngine`
- Recebe `viewMode` e `selectedMonth` como parametros
- Substitui logica duplicada de `useMonthlyForecast` e parte financeira de `useDashboardMetrics`

---

## Fase 4 -- UI do Dashboard

### A) Seletor de Modo de Visao
- Componente `FinancialViewSelector` com segmented control: `[Realizado] [Previsao] [Caixa]`
- Persistido em `localStorage` + query param `?view=`
- Colocado acima dos cards financeiros no Dashboard
- Tooltip em cada opcao explicando o que significa

### B) Cards Financeiros (`FinancialForecastCards`)
- **Previsao**: 3 cards (Receita/Custo/Lucro) com breakdown "Planeado do mes" + "Rollover" + microtexto "Inclui X projetos atrasados"
- **Realizado**: 3 cards (Receita/Custo/Lucro Realizado) -- apenas projetos entregues no mes
- **Caixa**: 3 cards (Entradas Recebidas / Saidas Pagas / Saldo do Mes) -- baseado em `paid_at`

### C) Resumo Mensal Consolidado
- Novo componente `MonthlySummaryBar` abaixo dos cards
- 5 metricas inline: Criados | Planeados | Entregues | Adiados | Resgatados
- Sempre visivel independente do modo

### D) Grafico (`FinancialChart`)
- Reage ao `viewMode` selecionado
- Realizado: linhas solidas receita/custo/lucro por `delivered_at`
- Previsao: linhas com rollover explicito
- Caixa: entradas/saidas/saldo por `paid_at`
- Todos usam `getTimeSeries` do engine

### E) Lista de Pagamentos Pendentes
- Previsao: mostra "A Receber (Previsto)" por `client_payment_due_date`
- Caixa: mostra "Recebidos no mes" + "Atrasados nao pagos"

---

## Fase 5 -- Pagina de Pagamentos (`/app/pagamentos`)

### Toggle no topo
- `[Por Vencimento] [Por Pagamento]`
- Por Vencimento: agrupa por `due_date` / `delivery_date`
- Por Pagamento: agrupa por `paid_at` / `client_paid_at`

### Resumo fixo no topo
- Total a receber (due) / Total recebido (paid)
- Total a pagar (due) / Total pago (paid)
- Atrasados (overdue) com contagem e valor

### Tabs existentes
- Aplicar filtro do toggle a: Clientes, Colaboradores, Custos Extras
- Ao mudar status de pagamento, auto-fill `paid_at` (via triggers DB)

---

## Fase 6 -- Mobile + Permissoes + Privacy

- Adaptar componentes mobile (`MobileFinancialSummary`, `MobileKPICarousel`, `MobilePendingPayments`) para reagir ao `viewMode`
- Manter permissoes: Admin ve tudo, Colaborador ve apenas ganhos proprios (em CAIXA: so seus recebimentos)
- `useHideValues` aplicado a todas as views

---

## Fase 7 -- Atualizacao do Status com paid_at

Atualizar handlers existentes em `Pagamentos.tsx`:
- `handleProjectRevenueStatusChange`: ja faz set/clear de `client_paid_at` (manter)
- `handleFreelancerStatusChange`: adicionar set/clear de `paid_at` em `project_team`
- `handleCostStatusChange`: adicionar set/clear de `custos_extras_paid_at`

(Os triggers DB servem como fallback de consistencia)

---

## Detalhes Tecnicos

### Ficheiros novos:
- `src/lib/finance/financialEngine.ts` -- logica pura de calculo
- `src/hooks/useFinancialEngine.ts` -- hook com fetch + engine
- `src/components/dashboard/FinancialViewSelector.tsx` -- seletor de modo
- `src/components/dashboard/MonthlySummaryBar.tsx` -- resumo 5 metricas

### Ficheiros modificados:
- `src/pages/app/Dashboard.tsx` -- integrar seletor + novo hook
- `src/components/dashboard/FinancialForecastCards.tsx` -- refactor para usar engine + 3 modos
- `src/components/dashboard/FinancialChart.tsx` -- refactor para 3 modos
- `src/components/dashboard/PendingPaymentsList.tsx` -- reagir ao modo
- `src/pages/app/Pagamentos.tsx` -- toggle vencimento/pagamento + resumo
- `src/hooks/useDashboardMetrics.ts` -- delegar calculos financeiros ao engine
- `src/hooks/useMonthlyForecast.ts` -- deprecated, substituido pelo engine
- Componentes mobile correspondentes

### Migracoes SQL:
- ADD COLUMN `paid_at` a `project_team`
- ADD COLUMN `custos_extras_paid_at` a `projects`
- CREATE triggers para auto-set/clear `paid_at`

### Ordem de implementacao:
1. Migracoes DB (paid_at + triggers)
2. financialEngine.ts (logica pura, testavel)
3. useFinancialEngine hook
4. FinancialViewSelector + MonthlySummaryBar
5. Refactor FinancialForecastCards para 3 modos
6. Refactor FinancialChart para 3 modos
7. Refactor PendingPaymentsList
8. Refactor pagina Pagamentos (toggle + resumo)
9. Adaptar mobile + colaborador
10. Limpar hooks antigos

