## Nova página: Financeiro → Fecho Mensal (Acertos)

Página **aditiva** dentro do hub Financeiro. Não toca no motor existente (`useFinancialEngine`, Single Financial Rule, Freelancer Payments Sync, páginas Custos/Lucro/Receitas/VisãoGeral).

### 1. Dados e queries reutilizados (zero refactor)

- `useProjects` — projetos e `delivered_at`, `agreed_value`, custos.
- `useTeamPayments` (de `usePayments.ts`) — pagamentos aos editores (`project_team`).
- `usePaymentsData` — projetos entregues, mutações de estado de pagamento (freelancer e custos extras). **Reutilizo `handleFreelancerStatusChange` para o "Marcar fecho como pago".**
- `useClients`, `useWorkspaceMembers`, `useFormatCurrency`, `useHideValues`, `useFinancialPermissions`, `useWorkspace`.
- `useCurrentWorkspace` / plano do workspace → detetar tipo (Freelancer vs Estúdio/Agência) para o modo simplificado.
- Constantes `paymentStatusLabels/Colors` de `src/lib/finance/constants.ts`.
- Export: `PaymentExportButtons`, `src/lib/excel-export-financial.ts`, `src/lib/pdf-export-reports.ts`.

Nenhuma nova tabela SQL. Nenhum migration. Apenas leitura+update dos campos já usados hoje (`project_team.payment_status/paid_at`, `projects.custos_extras_payment_status/paid_at`).

### 2. Regra de agrupamento

Registos agrupados **estritamente por `delivered_at` (mês/ano)** — o utilizador escolhe o mês no topo e vê o "fecho" desse mês. Se um projeto foi entregue em junho e pago em julho, continua no fecho de junho. Isto respeita a Single Financial Rule (só entram projetos com `is_delivered = true`).

### 3. Ficheiros novos

```
src/pages/app/financeiro/FechoMensal.tsx                  (página, ~seletor mês + composição)
src/hooks/useMonthlyClosing.ts                            (agregação: recebe mês, devolve
                                                           { revenue, editorPayable, ownerProfit,
                                                             alreadyPaid, byEditor[], settlements[] })
src/components/payments/closing/ClosingSummaryCards.tsx   (4 cartões KPI)
src/components/payments/closing/ClosingByEditor.tsx       (resumo por editor)
src/components/payments/closing/ClosingSettlementsTable.tsx (tabela de acertos + mobile cards)
src/components/payments/closing/MarkClosingPaidDialog.tsx (confirmação bulk)
```

Rota: adicionar `fecho` no `FinanceiroLayout.tsx` (nova tab) apontando para `FechoMensal.tsx`. Nada mudado nas outras tabs.

### 4. Composição da UI

- **Topo**: `PageHeader` já existe no layout; adiciono barra com seletor de mês (setas ← / →, botão "Hoje") reaproveitando o padrão de `VisaoGeral.tsx`.
- **KPIs (4 cartões)**: Receita do fecho · A pagar aos editores · Lucro do dono · Já pago. Todos calculados no hook a partir dos projetos entregues no mês selecionado.
- **Resumo por editor**: lista compacta (nome, nº de cards, valor a pagar) com botão "Exportar por editor" (Excel/PDF por editor — base da fatura).
- **Tabela de Acertos**: uma linha por `project_team` (editor) + linhas de custos extras pendentes. Colunas: ID (`project_code`), Editor, Tipo (edição/extra), Valor editor, Valor dono, Estado. Cards em mobile (padrão já usado em Faturação/Equipa).
- **Ações**: "Exportar lucro" (relatório dono), "Exportar por editor", "Marcar fecho como pago" (abre `MarkClosingPaidDialog` → confirma → chama a mutação de status em batch usando o mesmo caminho de `handleFreelancerStatusChange` + `custos_extras_payment_status`).

### 5. Adaptação Freelancer vs Estúdio/Agência

Detetar o tipo de workspace via plano/subscrição já disponíveis (`useUserSubscription` / `usePlanFeatures`) ou, como fallback simples nesta fase, via `useFinancialPermissions` (se `canViewAllFinancials` for false OU o workspace tem só 1 membro ativo → modo Freelancer). Confirmar contigo qual sinal preferes usar.

- **Freelancer**: esconde secção "Por editor" e coluna "Valor editor". Mostra apenas Receita − Custos = "O meu rendimento".
- **Estúdio/Agência**: mostra tudo, incluindo split editor/dono.

### 6. Como garanto que o motor NÃO é afetado

- Zero alterações em: `useFinancialEngine`, `financialEngine.ts`, `usePayments`, `usePaymentsData` (só consumo, não edito), `FreelancerPaymentsControl`, `ProfitControl`, `ProjectRevenueControl`, `Custos.tsx`, `Lucro.tsx`, `Receitas.tsx`, `VisaoGeral.tsx`.
- Sem migrations. Sem novas colunas. Sem alterações em RLS.
- As mutações do botão "Marcar fecho como pago" atualizam os mesmos campos e disparam os mesmos `invalidateQueries` que já existem, portanto a Freelancer Payments Sync continua consistente.
- Nada hardcoded a um cliente: só uso preçário/`agreed_value` do projeto e `payment_amount` do `project_team`, que já são por workspace.

### 7. Riscos e mitigações

- **Duplo pagamento acidental** com o "Marcar fecho como pago" → dialog de confirmação a listar quantos acertos serão marcados e valor total; só afeta itens em estado pendente/vencido.
- **Deteção Freelancer vs Estúdio** — se o sinal escolhido for ambíguo, exponho um toggle discreto (ícone) para alternar visão simples/completa manualmente.
- **Custos extras vs pagamento editor** — clarificar contigo: os "Acertos" devem incluir apenas pagamentos a editores (`project_team`), ou também `custos_extras`? Assumo por defeito **ambos** (com filtro por tipo na tabela), mas confirma.
- **Exports** — os botões novos usam os utilitários existentes; sem novas dependências.

### Pergunta rápida antes de implementar

1. A tabela de Acertos deve incluir **custos_extras** além de pagamentos a editores? (assumo que sim, com badge de tipo)
2. Como preferes detetar Freelancer: pelo plano/subscrição do workspace, ou pelo nº de membros, ou expor um setting em Configurações?