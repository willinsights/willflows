## Auditoria — Cards do Savio (Bliss Travel)

Regra: Savio recebe mensal fixo → `project_team.payment_amount = 0` em todas as linhas dele. Projetos ainda seguem tabela padrão de agreed_value/custo_edicao por duração:

| Cenário | agreed | custo_edicao |
|---|---|---|
| Só curta (≤25s) | 16 € | 10 € |
| Só longa (>25s) | 48 € | 30 € |
| Mista | 52 € | 40 € |
| Bliss padrão (sem versões) | 96 € | 60 € |

## Correções a executar

### 1) `project_team` — Savio a 0 €
Zerar `payment_amount` em linhas **pendentes** do Savio na Bliss onde ainda está com valor (13 linhas de 18/06 com 60 € pendentes):

```
Farm to Table Feast, Private Cruise to Blue Lagoon, Athens TailorMade Tour,
Athens Street Food Tour, Argolida Chronicles, Acropolis Insights,
Majestic Sounio, Wine & History in the Peloponnese, Historic Athens,
History in the Peloponnese (Epidauros)
```
+ qualquer outra linha pendente do Savio ainda >0 (rows `pago` mantêm-se).

### 2) `projects` — alinhar 0 €/0 € entregues (por duração real)

| Projeto | Curtas | Longas | Novo agreed / custo |
|---|---|---|---|
| Athens Segway Adventure | 1 | 3 | 52 / 40 |
| Chia Laguna - Hotel Village Sardinia | 0 | 1 | 48 / 30 |
| Lake Kaiak | 2 | 2 | 52 / 40 (custo já 60 → manter) |
| Nafplio Highlights Walking Tour | 2 | 2 | 52 / 40 |
| Nafplio Tasting Tour | 1 | 3 | 52 / 40 |
| TRILHA AGROTURISMO CANALES | 2 | 3 | 52 / 40 (custo já 60 → manter) |
| Wine & Tales Beneath the Parthenon | 0 | 2 | 48 / 30 |

Nota: para "Lake Kaiak" e "TRILHA…" o `custo_edicao` já está a 60 € (pago). Só atualizo `agreed_value` para não mexer no pago histórico.

### 3) Verificação final
`SELECT` no fim para confirmar que nenhuma linha pendente do Savio ficou com valor >0 na Bliss.

Sem alterações de schema nem de código — só data ops via insert tool.
