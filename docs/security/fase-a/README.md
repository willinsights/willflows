# Fase A — autenticação, envio semanal e quota concorrente (NÃO implantado)

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

## Correções preparadas em 17/11/2026, base 3a508332
- Resumo semanal: reserva durável única por workspace/utilizador/segunda-feira, antes de invocar `app-email`; conflito salta envio. `error` da invocação e resposta de negócio são verificados. Supressão não conta como enviado. Falha ou resultado ambíguo mantém reserva e devolve falha, nunca reenvia automaticamente.
- Limitação explícita: sem transação distribuída com o fornecedor, não existe garantia simultânea de exatamente um envio e recuperação automática. Uma interrupção após reserva pode perder um envio; estados `reserved`/`uncertain` exigem reconciliação autorizada antes de qualquer repetição. Não há expiração/reclaim automático que permita duplicação após 24 horas.
- Limpeza: `mark_cleanup_videos_deleted` faz `is_deleted=false→true` e subtração atómica no mesmo pedido. Só conta linhas efetivamente alteradas, inclui tamanho principal e substituição; falta de quota aborta a transação. Mantém referências de ficheiros para a passagem posterior de remoção, sem esquecer remoções falhadas.
- Catálogo lido: trigger atual `AFTER INSERT OR DELETE OR UPDATE OF file_size_bytes`; não observa `is_deleted`. Por isso a RPC não altera tamanhos nem substitui o trigger. Não resolve outras escritas históricas de quota fora deste handler.
- SQL aditivo em `candidate.sql`, fora de migrações aplicáveis; não altera ACL existente, Stripe, permissões de utilizadores ou limites. Novas RPCs só para `service_role`, guarda `IS NOT TRUE`, `SET search_path=public`. Ledger privado, sem emails/payloads.

## Evidência e testes
- 8 Vitest: handlers candidatos reais transpilados, cliente/email simulados, `fetch` bloqueado; duplicação paralela e sequencial, falha ambígua, falha de conclusão, supressão, semana distinta, quota via RPC e erro de gravação.
- 9 Deno de autenticação: válidos/invalidos/ausentes e compatibilidade gerida/antiga; executados `--cached-only --allow-env`, sem permissão de rede. Válidos chegam à falta intencional de configuração, não provam processamento de produção.
- PostgreSQL 17 descartável com socket Unix privado, sem TCP nem variáveis de produção: 8 reservas concorrentes, 8 eliminações da mesma versão + incremento concorrente de upload (1000−250+100=850), rollback atómico sem quota, reversão específica preservando histórico.
- `deno check` dos dois candidatos passou; compilação automática `build OK` às 21:24:29 UTC. Nenhuma compilação manual do projeto.
- Fontes anteriores em `rollback-sources/` são fontes do editor na base, NÃO exportação comprovada da versão em execução.

## Ativação e cutover: bloqueados, não executados
1. Aprovar SQL aditivo após conferir novamente catálogo/ausência dos novos nomes; preservar fontes ativas verificáveis. Aplicar SQL antes das funções dependentes, nunca o inverso.
2. Só depois ativar resumo; verificar próximo evento natural, sem executar cron manualmente. Reservas podem bloquear um envio incerto, não se deve removê-las sem reconciliação.
3. Limpeza permanece isolada: ativar autenticação pode desbloquear imediatamente remoções por um job já ativo. A instrução desta fase proíbe eliminar dados; implantação exigirá uma janela especificamente autorizada e prova de reversão.
4. Listagem atual mantém os cinco jobs ativos sem `target_kind/target_path/body`: conversão automática não suportada. `cleanup-expired-videos-daily` corre `0 * * * *`, apesar do nome. Nada foi ressincronizado nem duplicado.
5. Retifica-se a proposta anterior: criar primeiro um segundo job **não** garante ausência de sobreposição. As ferramentas documentadas criam/atualizam schedules geridos, mas não oferecem cutover atómico comprovado para os antigos; aguardar esse mecanismo, não recomendar criação em paralelo.
6. Não há logs HTTP atuais neste ensaio; não afirmar que os cinco devolvem 401 ou que voltaram a funcionar.

## Reversão
Restaurar fontes antes de remover RPCs. `rollback.sql` recusa reservas incertas e mantém ledger para impedir repetição histórica; não apaga dados. Não restaura ficheiros eliminados nem repõe quota histórica, pois nenhum dado real foi alterado neste trabalho.

## Pendências de idempotência fora do escopo
As verificações antes de inserir de prazos/alertas/Stripe não provam segurança sob concorrência sem restrição única confirmada. Avisos de expiração da limpeza ainda têm janela de concorrência antes de `notified`; esta fase protege a quota, não afirma idempotência de todos os seus avisos. O envio semanal corrigido não reenvia resultados incertos; falta processo operacional de reconciliação e prova do próximo envio natural após eventual ativação.
