
## Objetivo
Ajustar em massa os valores financeiros dos projetos da **Anzarya** que já tenham ≥1 versão no Review Studio, com base nas durações das versões.

## Regras de duração (por projeto)
Classificar cada `video_versions` não apagada pela `duration_seconds`:

- **curta** = ≤ 25s (alvo ~15s)
- **longa** = 26–60s (alvo ~45s)

Aplicar por projeto:

| Cenário | agreed_value | custo_edicao | Pagamento editor |
|---|---|---|---|
| Só **curta(s)** (~15s) | **16 €** | **10 €** | 10 € |
| Só **longa(s)** (~45s) | **48 €** | **30 €** | 30 € |
| **Curta + longa** (~15s + ~45s) | **52 €** | **40 €** | 40 € |
| Fora dos ranges | **ignorar** — sem alteração |

## Regra do editor (pagamento)
Ler `project_team` com `phase = 'edicao'`:

- **Morais** (match `ILIKE '%morais%'` em `profiles.full_name`/email) → `payment_amount = 0` (fixo mensal).
- **Christian** (match `ILIKE '%christian%'`) → 10 / 30 / 40 € conforme cenário.
- Outro editor → não alterar linha de pagamento.
- Sem linha `phase='edicao'` → deixar para revisão manual.

## Sobrescrita
- Sempre sobrescrever `projects.agreed_value` e `projects.custo_edicao`.
- Sempre sobrescrever `project_team.payment_amount` para o editor identificado.
- **Nunca** tocar em linhas com `payment_status = 'pago'` (proteção de histórico).

## Execução

1. **Preview** — SELECT dos projetos elegíveis (workspace Anzarya + ≥1 versão não apagada), mostrando: nome, nº curtas/longas/fora-range, editor detetado, valores atuais vs. novos, status pagamento. Contagem por cenário antes de escrever.

2. **Batch update** via `supabase--insert`:
   - `UPDATE projects SET agreed_value=?, custo_edicao=? WHERE id IN (...)` por cenário.
   - `UPDATE project_team SET payment_amount=? WHERE project_id IN (...) AND phase='edicao' AND user_id=<christian_uid> AND payment_status <> 'pago'`.
   - `UPDATE project_team SET payment_amount=0 WHERE project_id IN (...) AND phase='edicao' AND user_id=<morais_uid> AND payment_status <> 'pago'`.

3. **Relatório final** — por projeto: cenário aplicado + valores novos + lista de ignorados (fora de range / sem editor) para revisão manual.

## Notas
- Filtro base: `client_id` da Anzarya + `EXISTS (video_versions WHERE project_id=p.id AND is_deleted=false)`.
- Operação one-off de dados, sem alteração de código ou schema.
