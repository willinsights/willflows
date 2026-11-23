# Valores nos 95 cartões «Em espera 😒» (In-Sights)

## O que muda
Em cada um dos 95 cartões que estão agora na coluna «Em espera 😒» do In-Sights:
- **Preço do cliente:** 48€
- **Edição:** 30€, atribuída a **wilker oliveira**
- **Lucro resultante:** 18€ (48 − 30; calculado automaticamente, não é gravado à parte)

Só estes 95 cartões; cartões que entrem depois na coluna não são afetados. Nenhum ficheiro da app é alterado.

## Detalhes técnicos
- `projects.agreed_value = 48` para os projetos com `workspace_id = 6ee9555c-…` e `edicao_column_id = 37038877-…` (lista de IDs fixada antes da escrita).
- Inserir em `project_team` uma linha por projeto: `user_id = 697806bf-89b2-4ad6-af64-eaf0796a34c4`, `phase = 'edicao'`, `cost_amount = 30`, `payment_amount = 30`, `payment_status = 'pendente'`. O trigger `sync_project_people_costs` atualiza `custo_edicao = 30`.
- Se algum cartão estiver num mês fechado, o servidor recusa; nesse caso informo quais.
- Verificação final: 95 cartões com `agreed_value = 48`, `custo_edicao = 30` e lucro 18 em `v_project_profit`.
