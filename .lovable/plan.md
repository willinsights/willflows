## Auditoria — Bliss Travel (últimos 30 dias)

Regras aplicadas (iguais à auditoria Anzarya):

| Cenário | agreed_value | custo_edicao | Pagamento editor |
|---|---|---|---|
| Só curta (~15s) | 16 € | 10 € | = custo_edicao |
| Só longa (~45s) | 48 € | 30 € | = custo_edicao |
| Mista (curta + longa) | 52 € | 40 € | = custo_edicao |
| Savio | — | — | mantém 0 (fixo mensal) |

## Resultado da auditoria

Apenas **1 projeto** da Bliss Travel criado nos últimos 30 dias com versões no Review Studio, e está desalinhado:

| Projeto | Curtas | Longas | Atual (agreed/custo) | Novo | Editor |
|---|---|---|---|---|---|
| Wine Semeli Estate | 1 | 1 | 0 € / 0 € | **52 € / 40 €** | Savio (mantém 0) |

Nenhum outro projeto Bliss dos últimos 30 dias precisa de correção.

## Execução

1. `UPDATE projects SET agreed_value=52, custo_edicao=40 WHERE id='<Wine Semeli Estate id>'`.
2. Deixar `project_team.payment_amount = 0` para o Savio (regra fixa).
3. Reportar no chat o resultado final.

Operação one-off de dados, sem alteração de código ou schema.
