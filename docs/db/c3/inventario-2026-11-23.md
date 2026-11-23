# C3 — inventário antes da aplicação (23/11/2026, ~13:22 UTC)

Consultas só de leitura feitas pela Lovable na base de produção, a pedido do Gestor de Operações. A aprovação do proprietário (cartão de confirmação de 23/11) foi transmitida pelo JARVIS.

| Medida | Valor |
| --- | --- |
| Inventário por workspace («Passo 0»: não aprovadas, ativas, com mais de 30 dias) | 0 linhas |
| Contagem de versões legadas não aprovadas, ativas, com mais de 30 dias | **0** |
| Lista dessas versões | vazia |
| Versões legadas ativas com mais de 30 dias (contexto) | 42, todas com aprovação |

**Resultado:** o passo 1 de `candidate.sql` atualizaria 0 linhas (`c3.esperado = 0`). Não foi executado porque não há nada a descartar. Antes: 0 candidatas; depois: 0. Comentários e aprovações não foram tocados.

As versões legadas aprovadas saem pela regra A8 (7 dias após a aprovação), a partir dos ciclos horários da limpeza.

# A9 — retenção das versões privadas (wf2_)

| Momento | Valor |
| --- | --- |
| Migração `0022_private_video_retention.sql` aplicada (Lovable, ~13:21 UTC) | interruptor sem linha (desligado) |
| Pré-visualização a 7 dias (reprodução manual só de leitura da condição; a função recusa quem não é `service_role`) | **0 versões** a retirar |
| Contexto | 11 versões privadas, 3 aprovações, a primeira a 20/11 14:02 UTC |
| Interruptor ligado | `enabled=true`, `retention_days=7` |
| Primeiro ciclo com o interruptor ligado | 14:00 UTC de 23/11 (cron horário) |
