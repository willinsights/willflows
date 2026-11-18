# Próxima etapa segura — 18/11/2026

Base `317ef62b`. Apenas candidatos isolados. Nenhum caminho activo, SQL real, cron, envio, cobrança, eliminação ou segredo alterado. 46 push antigos permanecem intocados por defeito. Publicação global não é autorizada; copiar funções para caminhos activos pode implantá-las automaticamente.

## Decisões e resultado
1. **Primeiro lote recomendado: Stripe independente**, não resumo semanal. Só lê subscrições no Stripe e regista divergências no backend; caminho de email removido, não apenas desligado. Requer autorização de escritas de diagnóstico, não de cobranças. Não depende de quota, push, vídeo ou ledger semanal.
2. **Quota recomendada: `storage_limit_bytes` é total**, porque stripe-webhook já guarda base+addon nesse campo e a UI mostra esse total. `quota-total.sql` centraliza aritmética com `effective_video_quota`; evita somar addon duas vezes. Alternativa base+extra usa a MESMA função com `'base_extra'`, e requer que todos os writers/UI usem base_storage_bytes+extra; não somar storage_limit+extra. Nenhum preço, número de GB ou «Ilimitados» alterado. Aprovação do contrato é necessária antes de integração.
3. Upload durável: emissão vincula ID idempotente/contexto/chave/tamanho/autor/target; persistência e sequência transaccionais, claim antes de Stream, resultado incerto nunca automaticamente reenviado. Outbox conserva referências principais e substituições em overwrite/hard DELETE, inclusive cascatas; estado held, sem consumidor/apagamento implementado ou autorizado.
4. **NÃO pronto para activar vídeo:** SQL/módulo/ticket testados, mas emissor/frontend/processador activos não integrados. Faltam transição de tickets/abas antigas, prova HEAD no handler integrado, política expiração/abort e reconciliação física do fornecedor. Não inventar operação externa exactamente-uma-vez: timeout mantém submitting/uncertain, exige investigação.

## Recursos suportados — leitura efectuada
- CLI `lovable supabase` expõe logs/analytics/query/info/linter/slow-queries, não inventário de backups, exportação de código activo ou drain. Help/catálogo local examinados.
- `edge_function_logs` de stripe-reconcile/send-weekly-summary: **No logs found**. Analytics production tem 6 function_edge_logs e 12 edge_logs no conjunto acessível; projecção sanitizada encontrou process-automation-jobs v125 (4 HTTP 200) e webhook-retry-worker v61 (2 HTTP 401). São versões **observadas em logs**, não prova da versão mais recente. Não revelamos deployment IDs completos/headers/URLs/payloads.
- Para cinco handlers alvo, analytics filtrado devolveu zero linhas. Logo **sem prova de HTTP, versão ou drenagem** desses cinco. O 401 observado é do webhook-retry-worker, NÃO dos cinco. Não executar esse worker nesta fase; diagnóstico fora do lote.
- Boot/shutdown do contexto não comprova entrega/conclusão nem zero pedidos em curso. Sem pausa autorizada, não é possível provar drenagem de cutover.
- Backup/restauro não verificável por ferramenta; nenhum snapshot ou teste de restore afirmado. Fonte editor/View code não é bundle activo exportado.

### Instruções exactas ao proprietário, sem segredos
1. **More → Database → Manage → Backups**: consultar timestamp UTC do snapshot mais recente; não clicar Restore. Partilhar só timestamp/estado visível. Diário, até cerca de 14 dias; sem PITR. BD/schema apenas, sem ficheiros storage/R2/Stream. Para prova de recuperabilidade isolada: exportação pela UI para destino separado próprio, não restaurar produção. Exportar via **More → Database → Manage → Settings → Export project data → Export data → Database → Export → Start export**; não nos enviar export com contas/palavras-passe. Restauro real perde dados após snapshot e reverte schema; preservar estado actual por export antes de qualquer restauro futuro.
2. **More → Database → Manage → Edge functions → stripe-reconcile → View logs**: status, data da última alteração, período e entradas sanitizadas. **View code** abre editor e NÃO fecha requisito de bundle activo. Se não há deployment/version/artifact verificável nessa interface, registar indisponibilidade; proprietário deve obter do operador da plataforma apenas versão/artefacto e hash anteriores, sem credenciais. Não prometemos UI de download inexistente.
3. **More → Settings → Logs**: Edge logs/Function edge logs; filtro stripe-reconcile e janela UTC exacta; Refresh, Show more e Download só entradas carregadas. Partilhar resumo sanitizado timestamp/status/início/fim/request ID, nunca headers/corpos/tokens/emails. **More → Database → Manage → Jobs → stripe-reconcile-daily**: consultar start/end/Running; não clicar Disable/Run agora. Conclusão SQL pode ser só despacho HTTP, não drenagem.
4. Após futura autorização de pausa: operador precisa confirmar zero HTTP em curso/pendentes incluindo callers manuais; ferramentas disponíveis não dão contador autoritativo. Sem isso, STOP em vez de repetir auditorias.

## Contador divergente — diagnóstico sem ajuste
SELECT agregado limitado ao scope divergente: registado 89 456 443 782 bytes; activo principal 16 475 592 570, substituição 0; soft-deleted 262 643 983 516. Diferença contabilística 72 980 851 212, que **não coincide** com todos os soft-deleted; não concluir causa única. Trigger principal+RPC concorrente e soft-delete separado explicam possibilidade, não prova linha-a-linha.
`quota-reconciliation.sql` é template fail-closed com workspace/expected/target explicitamente aprovados e comparação actual; não injectámos ID real nem aplicámos. Só antes do guard de contador e com todos writers drenados; após guard recusa, não desactivar triggers. Reversão exige valor exacto anterior e ausência de novas escritas, não subtract cego. Para executar produzir pacote separado com valores/hash/autorização após confrontar inventário físico. Não considera soft-deleted como quota comercial activa.

## Integração vídeo proposta (não executada)
- Emissor: frontend gera operation_id UMA vez por ficheiro e conserva entre retries; chave determinística por esse ID mantendo cinco segmentos; servidor autentica e resolve contexto, chama issue_video_operation, assina ticket v2 com os valores persistidos e expiração retornada. Não reemitir ID com contexto diferente; replay após expiry requer novo upload aprovado.
- Processador: autentica novamente, compara ticket v2 com operação persistida, valida HEAD tamanho/object key antes de persist_video_operation; processDurableUpload claim antes de provider copy; nenhuma chamada DELETE em replacement. Sobreposto ou resultado antigo removido/superseded deve devolver conflito útil, não sucesso vazio.
- Token/claim result durável exige preservar ledger, sem TTL reclaim. Provider aceite+BD falhou conserva claim, não duplica. Se resultado chega após hard delete vai para outbox held. Consumidor outbox ainda não existe: não alegar storage físico reconciliado/libertado. Referências partilhadas devem ser verificadas antes de release, nunca delete por outbox automaticamente.
- Version ID e número mantidos em replacement neste novo candidato, conforme regra histórica de comentários. Fonte activa antiga incrementa número: diferença intencional neste candidato, decisão explícita do proprietário antes de integração; não modificada em produção.
- Troca de contrato total requer r2 preflight/check_storage_quota/trigger/hook a consultar a mesma função/retorno, e writers Stripe existentes preservados. Alternativa base_extra é desenho/teste aritmético, não pacote de cutover completo. Nunca implantar quota-total isoladamente sem transição de todos leitores/escritores.

## Testes e limites
`python3 docs/security/fase-a/next/tests/postgres.py`: PostgreSQL 17 descartável, Unix socket privado, env produtivo removido; **10 grupos PASS**. Independência SQL Stripe antes de Phase-A, 8 concorrentes, rollback sem perder divergências; upload Unicode 8 retries→1 linha/quota, 8 IDs diferentes→sequências distintas; overwrite/outbox, hard delete/rollback, late provider, expiry, quota total não soma twice, ACL/RLS e rollback histórico bloqueados.
`bun x vitest run --config docs/security/fase-a/next/vitest.config.ts`: **5 testes** incluindo ticket v2, provider único/uncertain, erro antes de enviar e handler Stripe real com fixtures e fetch bloqueado.
`deno check --node-modules-dir=none`: **3 módulos aprovados**, dependências públicas obtidas, nenhum serviço real invocado. Regressivos anteriores devem constar EVIDENCE.txt. Sem mudança de página/frontend activo; não há UI para verificar em browser. Testes não equivalem a deploy nem a carga total.

## Go/no-go e decisões concretas
| Lote | Preparação | Produção |
|---|---|---|
| Stripe mínimo | GO revisão, exact SQL/hash/rollback em stripe-minimal | NO-GO até backup + artefacto/versão + drenagem + aprovação específica |
| Upload/outbox | GO desenho SQL/integrador testado | NO-GO integração real/tickets antigos/HEAD/recuperação provider/cutover writers |
| Quota total | Recomendação técnica baseada em writer comercial existente | NO-GO aprovação contrato e baseline; nenhum limite alterado |
| Semanal | Não incluir no primeiro lote: exige autorização de envio natural | NO-GO independente, ledger anterior preservado |
| 46 push | Manter intocados; decisão por defeito cumprida | Nenhuma autorização de enviar/apagar |

**O proprietário precisa decidir:** confirmar contrato total e preservação de número em replacement; fornecer timestamp backup e prova operacional acima; depois aprovar pacote Stripe específico + pausa/drenagem/retoma do job 11. Não pedimos autorização vaga para todos os lotes. WillFlow 2.0 não concluído.