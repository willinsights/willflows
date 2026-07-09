
# Redesenho do Financeiro — plano

Trabalho **só em preview**, aditivo. Motor financeiro atual (Single Financial Rule, Freelancer Payments Sync, hooks `usePaymentsData`, `useFinancialEngine`, `usePayments`) fica intocado. As páginas antigas (`Receitas`, `Custos`, `CustosExtras`, `Lucro`, `VisaoGeral`, `FechoMensal`) continuam acessíveis internamente, mas o **default** do menu Financeiro passa a ser o novo ecrã unificado.

## 1) Inventário dos campos atuais e onde cada um "aterra" no novo desenho

Fonte: `usePaymentsData`, `useTeamPayments`, `useProjectCostLines`, `useFinancialEngine`.

**Projeto (`projects`)**
- `id`, `project_code`, `name` → identificação nas linhas (pool + acertos + detalhe)
- `client_id` + `clients.name` → filtro por cliente + agrupamento no fecho
- `is_delivered`, `delivered_at` → **regra única** para entrar na pool "Por faturar"
- `agreed_value` → receita do card (KPI Receita do fecho + Vista Lucro + Detalhe→Receitas)
- `custos_extras`, `custos_extras_payment_status`, `custos_extras_paid_at` → toggle "Incluir despesas extras" no pool + bloco "Despesas incluídas" no fecho + Detalhe→Custos Extras
- `client_payment_status`, `client_paid_at` → estado "por receber/recebido" do bloco **Lucro do dono** (marcar recebido usa este campo, exatamente como hoje em `handleProjectRevenueStatusChange`)
- `custo_captacao`, `custo_edicao` → alimentam Detalhe→Lucro por projeto (mantido do motor)
- `competence_month`, `delivery_date`, `shoot_date`, `created_at` → mantidos como estão no motor (usados só no detalhe/forecast, não no fecho)

**Pagamentos a editores (`project_team`)**
- `id`, `project_id`, `user_id` → linha de acerto por editor
- `payment_amount` → total por editor + KPI Custos do fecho
- `payment_status`, `paid_at` → estado por editor + botão "Marcar pago" (usa `handleFreelancerStatusChange`)

**Cost lines (`project_cost_lines`)** → continuam a alimentar Detalhe→Custos e o cálculo de lucro por projeto (via `useFinancialEngine`). Não são "editores", entram nas despesas do fecho apenas se o toggle estiver ligado.

**Nada é perdido.** Tudo o que hoje aparece em Receitas/Custos/Custos Extras/Lucro/Visão Geral fica acessível dentro do bloco **"Ver detalhe"** recolhido no fim do ecrã, alimentado pelos mesmos hooks.

## 2) Novo modelo de dados — fechos persistentes (aditivo)

Hoje o "fecho" é derivado de `delivered_at`. O pedido implica que o utilizador crie **lotes explícitos** com itens à escolha → precisa de tabelas novas:

```text
closings
  id, workspace_id, created_by, client_id (nullable, se misto → NULL),
  label, status ('open'|'received'), received_at, notes, created_at

closing_items
  id, closing_id, kind ('team'|'extra'|'revenue'),
  project_id, team_payment_id (nullable), amount_snapshot, created_at
```

- `revenue` items = os cards entregues incluídos no fecho (base da receita).
- `team` items = linhas de `project_team` incluídas (custo de editor).
- `extra` items = custos extras incluídos (quando toggle ligado).
- A pool "Por faturar" = cards entregues cujo `project_id` **não** existe em nenhum `closing_items` (kind='revenue', status open ou received).
- "Marcar recebido" no fecho → atualiza `closings.status` **e** propaga `client_payment_status='pago'` nos projetos do fecho (mantém a Single Financial Rule).
- "Marcar pago" num editor dentro do fecho → chama `handleFreelancerStatusChange` (não altera motor).

RLS: workspace-scoped (`workspace_id = current workspace` + membership check via `is_workspace_member`). Grants para `authenticated` e `service_role`.

## 3) Ecrãs / componentes

Rota nova: `/app/financeiro` passa a renderizar **`FinanceiroHub`** (o novo ecrã). As rotas antigas ficam em `/app/financeiro/legacy/*`.

Ficheiros a criar:
- `supabase/migrations/…_closings.sql` — tabelas + RLS + grants.
- `src/hooks/useClosings.ts` — CRUD (list, create, get, markReceived, addItems, removeItem) via Supabase.
- `src/hooks/useUnbilledPool.ts` — deriva pool a partir de `usePaymentsData` + `useTeamPayments` menos itens já em fechos.
- `src/pages/app/financeiro/FinanceiroHub.tsx` — ecrã único.
- `src/components/finance/hub/UnbilledPool.tsx` — lista com checkboxes, filtros editor/cliente, toggle despesas extras, rodapé + "Criar fecho".
- `src/components/finance/hub/ClosingsList.tsx` — cartões dos fechos.
- `src/components/finance/hub/ClosingDetail.tsx` — 3 KPIs, bloco Lucro do dono, acordeão editores, despesas incluídas.
- `src/components/finance/hub/ClosingEditorAccordion.tsx`.
- `src/components/finance/hub/DetailDrawer.tsx` — recolhido; embrulha as vistas legadas (Receitas/Custos/Custos Extras/Lucro) via os componentes existentes.
- `src/components/finance/hub/GlobalProfitView.tsx` — vista lucro global com filtros (cliente, editor, período, fecho, estado).
- `src/lib/finance/closingExports.ts` — reutiliza `excel-export-financial.ts` para "Exportar lucro" (dono) e "Exportar [editor]".

Ficheiros a editar:
- `src/pages/app/financeiro/FinanceiroLayout.tsx` — nav reduzida a: **Financeiro** (hub, default), **Lucro global**, **Detalhe ▾** (dropdown com legado). Remove as 6 abas atuais do topo.
- `src/App.tsx` — nova rota `FinanceiroHub` como index; legados movidos para `/app/financeiro/legacy/*` (mantidos, não apagados).

## 4) Adaptativo Freelancer vs Estúdio

Já existe o heurístico em `useMonthlyClosing` (nº de membros ativos + permissões). Reutilizo:
- **Freelancer**: KPI passa a 2 cartões (Receita, Custos) + "O meu rendimento = Receita − Custos". Sem acordeão por editor (só linha "Eu"), sem "Exportar por editor".
- **Estúdio/Agência**: versão completa (3 KPIs + acertos por editor + Lucro do dono).

## 5) Fluxo do utilizador

1. Vai a **Financeiro** → vê pool "Por faturar" no topo.
2. Filtra por cliente/editor, liga toggle "Incluir despesas extras" se quiser.
3. Marca linhas → rodapé mostra selecionados + total → **Criar fecho**.
4. Fecho aparece em "Fechos criados". Abre → 3 KPIs, exporta lucro, marca recebido, expande editor → exporta base de fatura, marca pago.
5. Precisa do granular antigo? Abre "Ver detalhe" no fim.
6. Precisa da visão macro? Abre "Lucro global".

## Confirmação antes de codar

Confirmas que:
- (a) posso criar as tabelas `closings` / `closing_items` (aditivas, com RLS por workspace);
- (b) o botão "Marcar recebido" no fecho **pode** propagar `client_payment_status='pago'` nos projetos incluídos (mantendo consistência com Receitas atual)?

Se sim a ambos, avanço.
