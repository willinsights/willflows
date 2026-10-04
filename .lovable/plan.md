# Separar "Custo (card)" de "Pagamento" na equipa do projeto

## Avaliação

A proposta funciona. Os dados atuais confirmam o ponto de partida. `sync_project_people_costs` soma hoje `payment_amount` por fase em `projects.custo_captacao` e `projects.custo_edicao`. `v_project_profit` lê esses campos do projeto e por isso herda a mudança sozinho. `v_collaborator_payments` só expõe `payment_amount` e continua certa para "A pagar".

Há um ponto a corrigir em relação à proposta: o lucro do Fecho (`useMonthlyClosing`) **não** usa os campos do projeto. Soma diretamente `payment_amount` das linhas da equipa. Se só mudarmos o trigger, o Fecho passa a mostrar um lucro diferente do Dashboard e dos Relatórios. Por isso o Fecho tem de passar a usar `COALESCE(cost_amount, payment_amount)` no custo e manter `payment_amount` só em "a pagar/pago".

## Regra final

- **Custo (card)** = `COALESCE(cost_amount, payment_amount)`. Entra em custo_captacao/edicao, no lucro, em Movimentos e no Fecho.
- **Pagamento** = `payment_amount`. Só alimenta A pagar à equipa, Colaboradores, Movimentos (caixa), Meus Ganhos e Ranking.
- Caso Savio: Custo = 60, Pagamento = 0. O card desconta 60 e ele não aparece em "A pagar". Uma linha com pagamento 0 deve ficar escondida da lista "A pagar" (confirmar que já é filtrada por valor maior que 0).

## Migração SQL proposta

```sql
ALTER TABLE public.project_team ADD COLUMN cost_amount numeric NULL;

-- Backfill: hoje custo e pagamento são iguais
UPDATE public.project_team SET cost_amount = payment_amount
 WHERE cost_amount IS NULL AND payment_amount IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_project_people_costs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := COALESCE(NEW.project_id, OLD.project_id);
BEGIN
  UPDATE public.projects p SET
    custo_captacao = COALESCE((SELECT sum(COALESCE(cost_amount, payment_amount)) FROM public.project_team
                               WHERE project_id = pid AND phase::text = 'captacao'), 0),
    custo_edicao   = COALESCE((SELECT sum(COALESCE(cost_amount, payment_amount)) FROM public.project_team
                               WHERE project_id = pid AND phase::text = 'edicao'), 0)
  WHERE p.id = pid;
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    UPDATE public.projects p SET
      custo_captacao = COALESCE((SELECT sum(COALESCE(cost_amount, payment_amount)) FROM public.project_team
                                 WHERE project_id = OLD.project_id AND phase::text = 'captacao'), 0),
      custo_edicao   = COALESCE((SELECT sum(COALESCE(cost_amount, payment_amount)) FROM public.project_team
                                 WHERE project_id = OLD.project_id AND phase::text = 'edicao'), 0)
    WHERE p.id = OLD.project_id;
  END IF;
  RETURN NULL;
END $$;

-- Mês fechado: cost_amount também fica bloqueado
CREATE OR REPLACE FUNCTION public.guard_closed_month_team() ...
  -- condição de "só estado de pagamento" passa a incluir:
  --   AND NEW.cost_amount IS NOT DISTINCT FROM OLD.cost_amount

-- (opcional) expor na vista para relatórios
CREATE OR REPLACE VIEW public.v_collaborator_payments AS
  SELECT ..., pt.cost_amount, ... ;  -- adicionada no fim da lista de colunas
```

Notas:
- O backfill (`UPDATE`) dispara o trigger de sincronização e o guard de mês fechado. Como os valores ficam iguais, os custos não mudam. Mas o guard rejeitaria as linhas de meses fechados. Por isso o backfill corre com os triggers desligados (`ALTER TABLE ... DISABLE TRIGGER USER` e depois `ENABLE`), na mesma migração.
- O trigger do banco tem de ser alterado antes do formulário, e o formulário só deve chegar depois.

## Ficheiros a alterar

- `src/components/projects/TeamMemberPaymentInput.tsx`: dois campos, "Custo (card)" e "Pagamento". Custo vazio = usa o Pagamento.
- `src/components/projects/CreateProjectModal.tsx`, `ProjectDetailsSheet.tsx` e `details/EditModeContent.tsx`: guardar e ler `cost_amount`.
- `src/components/projects/ProjectFinancialTab.tsx`: mostrar o custo e o pagamento quando forem diferentes.
- `src/hooks/useMonthlyClosing.ts`: custo das linhas da equipa = cost ?? payment, para o lucro; payable/paid continuam com payment. Novos campos: `edicaoCost`, `captacaoCost`, `myTotal`.
- `src/hooks/usePayments.ts` / `useTeamPayments`: incluir `cost_amount` no select.
- `src/pages/app/financeiro/Movimentos.tsx` + `useTransactionFeed.ts`: tabela por projeto com Receita | Edição | Captação | Lucro | Meu total, mais linha de total.
- Exportações do Fecho (PDF/Excel em `src/lib/excel-export-financial.ts`, `pdf-export-reports.ts` / componentes de Fechos): as mesmas colunas e o total.
- `src/lib/finance/__tests__/financialEngine.test.ts` e um teste novo para o Fecho com o caso custo ≠ pagamento.
- Ficheiros que **não** mudam (usam pagamento, e isso está certo): PayablesByCollaborator, FreelancerPaymentsControl, useCollaboratorForecast, useCollaboratorRanking, useTodayAgenda, useDashboardMetrics (só "a pagar").

## Definição a confirmar: "Meu total"

Proposta: Meu total = Receita − custo de edição dos cards. A captação não é descontada, porque é o trabalho que você faz.
- Lucro = Receita − (Edição + Captação + extras + custos detalhados), pela regra única.
- Se quiser descontar também extras e custos detalhados, diga e ajusto.

## Riscos

- **Fechos já emitidos** (closings/closing_items): são fotografias e não mudam. Depois do backfill os números continuam iguais. Só divergem se alguém alterar o custo de um mês fechado, e o guard impede isso.
- **Permissões**: `cost_amount` tem de seguir a mesma proteção de `payment_amount`. O colaborador só vê a própria linha (RLS por linha já cobre). Confirmar que `get_project_team_roster` não expõe a nova coluna.
- **Relatórios e Excel**: lêem custo_captacao/edicao do projeto e herdam a mudança automaticamente. Os ecrãs que somam `payment_amount` como *custo* têm de ser revistos. O caso conhecido é o Fecho. Antes de implementar, faço uma busca nos 20 ficheiros que usam `payment_amount`.
- **Realtime e cache**: listas abertas só mostram o novo custo depois de recarregar (a invalidação já existe).
- **Caixa (CAIXA)**: continua a contar só o que foi pago. O custo de Savio pago por terceiros não aparece como saída de caixa, e isso está correto.

## Estimativa

- Migração + trigger + guard + vista: 1 passo.
- Formulário da equipa (3 ecrãs): 2–3 passos.
- Fecho + Movimentos + exportações + testes: 3–4 passos.
- Verificação no app com a sua conta: 1–2 passos.
- Total aproximado: **8–12 créditos**, conforme a revisão dos 20 ficheiros encontrar mais pontos a ajustar.
