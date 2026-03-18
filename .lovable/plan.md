

## Auditoria Completa do Sistema Financeiro WillFlow

---

### 1. VISÃO GERAL — O QUE EXISTE E PRINCIPAIS DORES

O sistema financeiro do WillFlow está distribuído por **4 camadas de cálculo independentes** que recalculam as mesmas métricas com lógica diferente:

| Camada | Ficheiro | Linhas | Responsabilidade |
|--------|----------|--------|-----------------|
| Motor Financeiro | `useFinancialEngine.ts` + `financialEngine.ts` | ~250 | Dashboard (3 modos: Realizado/Previsão/Caixa) |
| Dashboard Metrics | `useDashboardMetrics.ts` | 735 | Dashboard KPIs, chart, forecast, pending payments, events |
| Pagamentos | `Pagamentos.tsx` | 967 | Forecast mensal, global summary, inline queries |
| Relatórios | `Relatorios.tsx` | 1230 | monthlyData, topClients, collaborators, inline queries |

Adicionalmente existem **3 hooks satélite** que duplicam lógica:
- `useMonthlyForecast.ts` — recalcula previsão (duplica `financialEngine` modo PREVISAO)
- `useCollaboratorForecast.ts` — recalcula earnings do colaborador (duplica `useDashboardMetrics.meusGanhos`)
- `ProfitControl.tsx` — fetch independente + cálculo de lucro (duplica tudo)

**Resultado**: o mesmo projecto pode mostrar lucro diferente no Dashboard, em Pagamentos > Lucro, e em Relatórios.

---

### 2. MAPA DE MÓDULOS

```text
FINANCEIRO
├── Dashboard.tsx
│   ├── useFinancialEngine (Realizado/Previsão/Caixa)
│   ├── useDashboardMetrics (KPIs, forecast, events, activity)
│   ├── useCollaboratorForecast (ganhos colaborador)
│   └── useMonthlyForecast (forecast admin)
├── Pagamentos.tsx (967 linhas)
│   ├── inline Supabase queries (L99-136)
│   ├── inline monthlyForecast useMemo (L178-225)
│   ├── inline globalSummary useMemo (L228-267)
│   ├── ClientPaymentsControl.tsx  (tabela payments)
│   ├── FreelancerPaymentsControl.tsx (tabela project_team)
│   ├── ProjectRevenueControl.tsx (tabela projects)
│   ├── ExtraCostsPaymentsControl.tsx (tabela projects)
│   ├── ProfitControl.tsx (fetch independente + cálculos)
│   └── PaymentExportButtons.tsx (formatCurrency próprio)
├── Relatorios.tsx (1230 linhas)
│   ├── inline monthlyData useMemo (L283-324)
│   ├── inline topClients useMemo (L327-348)
│   ├── inline summaryMetrics useMemo (L380-401)
│   ├── inline useEffect colaboradores (L152-280)
│   └── inline PDF template (L464-607, ~140 linhas HTML)
└── Finalizados.tsx (projetos entregues com formatCurrency local)
```

---

### 3. DATA MODEL FINANCEIRO (Fonte de Verdade)

**Tabelas envolvidas:**
- `projects` — `agreed_value`, `custo_captacao`, `custo_edicao`, `custos_extras`, `client_payment_status`, `client_paid_at`, `client_payment_due_date`, `delivered_at`, `competence_month`, `is_delivered`
- `project_team` — `payment_amount`, `payment_status`, `paid_at`, `phase`, `user_id`
- `payments` — tabela genérica (usada APENAS em `ClientPaymentsControl` via `usePayments`) — **praticamente órfã**

**Problema crítico**: Existem DUAS tabelas para receita de clientes:
1. `projects.agreed_value` + `client_payment_status` (usada em Previsão, Lucro, Relatórios, Dashboard)
2. `payments` com `is_receivable=true` (usada APENAS no tab "Pag. Clientes")

Isto cria **dois sistemas de receita paralelos** que não se cruzam.

---

### 4. TOP 20 PROBLEMAS (por severidade)

| # | Sev. | Problema |
|---|------|----------|
| 1 | CRÍTICO | **Duas fontes de receita**: `projects.agreed_value` vs `payments.is_receivable`. O globalSummary mistura ambas. |
| 2 | CRÍTICO | **`useDashboardMetrics` e `useFinancialEngine` calculam as mesmas métricas com lógica diferente** — Dashboard usa ambos simultaneamente |
| 3 | CRÍTICO | **Custos duplicados potenciais**: `project_team.payment_amount` são os detalhes de `custo_captacao + custo_edicao`. Se alguém preenche ambos independentemente, os custos podem não bater |
| 4 | ALTO | **`formatCurrency` redefinido em 31+ ficheiros** em vez de usar `useCurrentWorkspace().formatCurrency` |
| 5 | ALTO | **`statusLabels`/`statusColors` copiados em 6 ficheiros** |
| 6 | ALTO | **`Pagamentos.tsx` faz 3 queries Supabase inline** (L99-136) em `useEffect` sem react-query — sem cache, sem dedup |
| 7 | ALTO | **`ProfitControl.tsx` faz fetch independente** dos mesmos dados que `Pagamentos.tsx` já tem |
| 8 | ALTO | **`Relatorios.tsx` calcula monthlyData inline** replicando `getTimeSeries` do financialEngine |
| 9 | ALTO | **`Relatorios.tsx` colaboradores useEffect (120 linhas)** — fetch + agregação inline, sem cache |
| 10 | ALTO | **`useMonthlyForecast` é redundante** — duplica modo PREVISAO do `financialEngine` |
| 11 | ALTO | **Sem IVA/retenção** — projetos europeus (PT 23% IVA). Assumido: não implementado. Os valores são brutos sem distinção |
| 12 | MÉDIO | **`useCollaboratorForecast` duplica** lógica de ganhos que `useDashboardMetrics.meusGanhos` já calcula |
| 13 | MÉDIO | **Template PDF de 140 linhas inline** em `Relatorios.tsx` (L464-607) — deveria usar `generatePdfHtml` como `ProfitControl` já faz |
| 14 | MÉDIO | **Previsão tab em Pagamentos usa `payments` table** para "outros pagamentos" mas `projects` table para receita — inconsistente |
| 15 | MÉDIO | **Sem relatório detalhado por colaborador** — só existe Top 10 ranking. Falta: "quanto devo ao Christian este mês?" |
| 16 | MÉDIO | **`Pagamentos.tsx` globalSummary** soma `projectRevenue` + `payments` + `teamPayments` + `projectCosts` de queries diferentes |
| 17 | MÉDIO | **Relatórios não usam `competence_month`** no filtro por período — usam `isWithinInterval(effectiveDate)` que pode falhar em edge cases |
| 18 | BAIXO | **`PaymentExportButtons` tem formatCurrency próprio** (L142) ignorando o que recebe por contexto |
| 19 | BAIXO | **`Pagamentos.tsx` re-fetches data on status change** (L374-388) em vez de invalidar react-query |
| 20 | BAIXO | **Sem testes** para cálculos financeiros — zero unit tests no `financialEngine.ts` |

---

### 5. PROPOSTA DE SIMPLIFICAÇÃO

#### Fase 1: Constantes e Utilitários (PR1 — baixo risco)
- Criar `src/lib/finance/constants.ts` com `statusLabels`, `statusColors`
- Substituir todos os `formatCurrency` locais por `useCurrentWorkspace().formatCurrency`
- **~15 ficheiros afectados, zero mudança funcional**

#### Fase 2: Eliminar hooks redundantes (PR2 — médio risco)
- **Eliminar `useMonthlyForecast.ts`** — substituir por `useFinancialEngine('PREVISAO', month)`
- **Eliminar `useCollaboratorForecast.ts`** — mover lógica para dentro do Dashboard com query dedicada
- **Refactorizar `useDashboardMetrics.ts`**: remover cálculos de receita/custo/lucro/forecast/monthlyData/annualComparison (~350 linhas) e usar `useFinancialEngine` para tudo financeiro. Manter apenas: `urgentProjects`, `recentActivity`, `upcomingEvents`, `performanceMetrics`, `pendingPaymentItems`
- **Resultado**: ~735 → ~300 linhas

#### Fase 3: Extrair lógica de Pagamentos (PR3 — médio risco)
- Criar `src/hooks/usePaymentsPage.ts`:
  - Migrar queries inline para react-query
  - Encapsular `monthlyForecast` e `globalSummary`
  - Encapsular handlers de status change
- **`Pagamentos.tsx`**: ~967 → ~400 linhas (só UI)
- **`ProfitControl.tsx`**: receber dados por props em vez de fetch próprio

#### Fase 4: Extrair lógica de Relatórios (PR4 — médio risco)
- Criar `src/hooks/useCollaboratorRanking.ts` (fetch + agregação de colaboradores)
- `Relatorios.tsx` usa `getTimeSeries` do financialEngine para `monthlyData`
- Mover template PDF para `src/lib/pdf-export.ts`
- **`Relatorios.tsx`**: ~1230 → ~500 linhas

#### Fase 5: Relatório por Colaborador (PR5 — feature nova)
- Nova aba "Colaboradores" em Relatórios com:
  - Filtro por colaborador, período, fase, status pagamento
  - Tabela: Projeto | Fase | Valor | Status | Data Entrega
  - Totalizadores: Total Pendente, Total Pago, Total Geral
  - Export Excel/PDF
- Query: `project_team` JOIN `projects` JOIN `profiles` filtrado por `user_id` + período
- Responde a "Quanto devo pagar ao Christian este mês?"

#### Fase 6: Decisão sobre tabela `payments` (PR6 — alto risco, decisão de produto)
- A tabela `payments` é usada apenas no tab "Pag. Clientes" e parece ser um legado
- **Opção A**: Migrar tudo para `projects` (já é a fonte de verdade para 90% do sistema)
- **Opção B**: Manter `payments` para movimentos manuais (reembolsos, ajustes) mas separar claramente da receita de projectos
- Recomendo **Opção B** mas renomear tab para "Outros Movimentos"

#### Fase 7: Server-side calculations (PR7 — longo prazo)
- Criar views SQL ou RPCs no Supabase:
  - `v_project_profit` — receita, custos, lucro, margem por projecto
  - `v_monthly_summary` — agregação mensal
  - `v_collaborator_payments` — pagamentos por colaborador com JOIN de profiles
- Eliminar cálculos repetidos no frontend

---

### 6. RELATÓRIOS POR COLABORADOR — Design Detalhado

**Query base:**
```sql
SELECT 
  pt.user_id,
  p2.full_name,
  p2.avatar_url,
  pt.phase,
  pt.payment_amount,
  pt.payment_status,
  pt.paid_at,
  p.id as project_id,
  p.name as project_name,
  p.project_code,
  p.delivery_date,
  p.delivered_at,
  p.is_delivered,
  p.competence_month,
  c.name as client_name
FROM project_team pt
JOIN projects p ON pt.project_id = p.id
LEFT JOIN profiles p2 ON pt.user_id = p2.id
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.workspace_id = $workspace_id
```

**UI proposta:**
- Selector de colaborador (dropdown com avatar)
- Filtros: período (mês), fase (captação/edição), status (pendente/pago/vencido)
- Tabela com colunas: Projecto | Cliente | Fase | Estado Proj. | Status Pgto | Valor | Data
- Cards de resumo: Total Pendente | Total Pago | Total Geral | Nº Projectos
- Botões Excel/PDF

---

### 7. PLANO DE IMPLEMENTAÇÃO

```text
PR1: Centralizar constantes e formatCurrency    [1-2h] [baixo risco]
PR2: Eliminar hooks redundantes                 [3-4h] [médio risco]  
PR3: Extrair lógica Pagamentos para hook        [2-3h] [médio risco]
PR4: Extrair lógica Relatórios para hooks       [2-3h] [médio risco]
PR5: Nova aba Relatório por Colaborador         [3-4h] [baixo risco]
PR6: Decisão tabela payments                    [1h decisão + 2h impl]
PR7: Views SQL server-side (futuro)             [4-6h] [médio risco]
```

**Critérios de aceitação:**
1. Um projecto mostra o mesmo lucro em Dashboard, Pagamentos > Lucro, e Relatórios
2. `formatCurrency` não existe em mais nenhum ficheiro além de `useCurrentWorkspace`
3. `statusLabels`/`statusColors` vêm de `constants.ts` em todos os componentes
4. "Quanto devo ao X este mês?" tem resposta clara na aba Colaboradores
5. Pagamento de colaborador nunca duplica custo do projecto
6. Zero queries Supabase inline em páginas — tudo via hooks com react-query

**Testes necessários:**
- Unit tests para `financialEngine.ts` (todas as funções, 3 modos)
- Teste de consistência: mesmo dataset → mesmo resultado em Dashboard e Relatórios
- Teste de edge cases: projecto sem datas, projecto com competence_month, rollover

---

### 8. NOTAS ASSUMIDAS

- **IVA**: Não implementado. Recomendo adicionar campo `tax_rate` ao projecto no futuro (PR separado)
- **Retenção na fonte**: Não implementado. Relevante para freelancers PT (campo `withholding_rate` em `project_team`)
- **Moeda**: Valores em decimal (float). Recomendo migrar para centavos (integer) a longo prazo
- **RBAC**: Já implementado via `useFinancialPermissions` — funciona bem

