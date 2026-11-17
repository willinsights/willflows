# Fase A — autenticação gerida em cleanup-expired-videos (candidato, NÃO implantado)

Estado: candidato staged fora de `supabase/functions/` porque editar o caminho ativo pode implantar automaticamente.
Produção, agendamentos, frequências e segredos inalterados.

## Alteração (diff vs ativo)
- Importa `../_shared/cron-auth.ts`; recusa só quando `x-cron-secret` (CRON_SECRET/AUTOMATION_CRON_SECRET) **e** Bearer gerido falham — mesmo padrão das outras quatro.
- `serve` (std 0.190) → `Deno.serve` (igual a check-deadlines; permite teste do handler real).
- Config gerida ausente → 401 (fail-closed).

## Testes (Deno, offline, segredos fictícios) — 9/9
válido gerido atual/anterior, x-cron-secret legado, AUTOMATION_CRON_SECRET; inválido gerido, inválido legado, ausente, Bearer malformado, config gerida ausente. `deno check` OK.
Executar: `cd docs/security/fase-a && deno test --allow-env --allow-net=deno.land,esm.sh tests/`

## Idempotência (leitura de código)
| Handler | Reexecução | Risco no cutover |
|---|---|---|
| check-deadlines | verifica notificação existente antes de criar | baixo |
| check-payment-alerts | verifica alerta já notificado | baixo |
| stripe-reconcile | só insere divergência sem aberta igual | baixo (corrida concorrente possível) |
| cleanup-expired-videos | filtra status/`is_deleted=false`; quota por ler-e-escrever | baixo sequencial; corrida concorrente na quota |
| send-weekly-summary | **sem chave anti-duplicação** em `app-email` | **alto: execução dupla = email duplicado** |

## Cutover suportado (não executado)
1. Implantar esta função (copiar para caminho ativo + deploy individual).
2. Para cada job: criar agendamento gerido (`create_http_schedule`) com horário que não coincida, e desativar o antigo (`cron.alter_job active:=false`) antes da próxima janela; apagar só depois de 1 execução 200 confirmada em logs.
3. send-weekly-summary: só após chave de idempotência semanal por utilizador, ou troca numa janela fora de segunda 09:00.
Reversão: reativar job antigo, desativar o gerido; função aceita ambos.
