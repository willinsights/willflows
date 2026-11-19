# Integração vídeo/quota — 18/11/2026

## Estado de 19 de novembro

O [runbook](CUTOVER-RUNBOOK.md) e o [registo dos ensaios](RELEASE-GATES-2026-11-18.md) acompanham a revisão atual. O percurso de aprovação pública, a recuperação de resposta perdida, a reconciliação protegida do contador e a compatibilidade com o antigo RPC têm cobertura de regressão. A aplicação real dos SQL e a validação do fornecedor continuam pendentes.

## Registo histórico de 18 de novembro

Base 24869199. Candidato isolado; produção intacta. Interrompido por créditos indisponíveis antes de compilação isolada, ensaio de navegador e fecho integral. **Não pronto para implantação.**

## Implementado
- Emissor/processador/abort/recover com adaptadores reais em supabase/functions, tickets v2 e ponte determinística v1, autenticação/contexto, HEAD antes de persistir, claim permanente antes do provider, recuperação apenas de UID exacto existente; sem resubmissão incerta.
- Frontend real useVideoVersions adaptado, cliente reutiliza ID/PUT entre retries, cancelamento/recuperação; hook de quota sem escrita de contador/default optimista; painel administrativo usa total, não total+extra.
- SQL 00-accounting, 01-upload, 02-total-quota: lock de escritores, delta transaccional, reservas por operação, abort sem apagar, outbox held em overwrite/cascatas e uploads parciais. Substituição mantém ID/número/comentários (candidato, confirmação comercial pendente).
- Stripe webhook espelhado: total base+extra existente preservado; cancelamento usa base persistida. Nenhum preço/GB/Ilimitados alterado. Pacote Stripe mínimo anterior NÃO modificado nem misturado neste lote.
- Leitores G04/S03 espelhados; actualizadores de estado copiados. Nenhum consumidor destrutivo de outbox.

## Evidência efectivamente executada
- 24 Vitest: 17 integração simulada + 7 autorização worker. Rede fetch bloqueada. Unicode, 32 retries simultâneos/1 provider, HEAD ausente/tamanho/etag, contexto multi-tenant, v1, expiry, resultado persistido após expiry, timeout, zero/duplo match provider, recuperação, abort, substituição/comentários e quota total 12000 (não 14000).
- 13 grupos PostgreSQL 17 descartável, socket Unix privado/listen_addresses vazio: Stripe SQL independente primeiro/rollback, 8 retries/1 linha/1 crédito, sequência concorrente, claims, replacement/outbox, hard delete/rollback/late provider, expiry, limite, ACL/RLS, segundo tenant, 12 reservas concorrentes→3 aceites, abort, recovery, cascata. SQL nunca enviado à BD real.
- Regressivos next: 5 Vitest aprovados incluindo handler Stripe independente; G04/S03 revised: 19 testes aprovados. Estes exercitam fontes anteriores, não são prova dos handlers copiados compilados.
- Sem build manual do projecto activo; compilação da cópia e Deno checks desta integração NÃO executados. Sem navegador/E2E de UI, sem integração provider real.

## Bloqueios de código ainda a fechar (sem nova auditoria)
1. Criar cópia temporária com overlay e compilar frontend/funções; ensaiar navegador com sessão/backend/provider fictícios e egress bloqueado. Métodos abort/recover expostos pelo hook ainda precisam ligação explícita aos controlos da UI.
2. Consolidar check_storage_quota/preflight, grants anti-writer antigo, add_workspace_storage e todos os writers legados no SQL final standalone: 00-accounting depende do trigger anterior; não é migração autónoma aprovada. Não copiar parcialmente.
3. PUT assinado não é revogável: HEAD tamanho/etag não prova imutabilidade entre HEAD e provider. Necessário congelamento/cópia imutável ou condição de object version validada, sem prometer exactamente-uma-vez externo.
4. Reserva expirada conserva operação, mas ainda falta outbox explícita de expiry e ensaio crash/parent cascade completo com comentário real/FK/rollback consolidado. Não iniciar consumidor de eliminação.
5. Ponte v1: adoptar legado persistido evita recopy, mas completar fixtures três segmentos undefined/null e validação SQL correspondente; não activar enquanto incompatível. Pedidos v2 sem operationId (aba antiga durante transição) precisam contrato de devolução v1 ou bridge v2 verificável; não descodificar payload sem assinatura.
6. Actualizações Stream espelhadas exigem fencing contra UID supersedido após replacement. Provider search/meta da recuperação requer prova contratual paginada; zero matches nunca autoriza reenviar.
7. Reversão upload recusa ledger/outbox preenchidos; reversão completa de trigger/quota/SQL 00–02 não finalizada. Usar recuperação forward depois de qualquer operação, nunca voltar a processador antigo destrutivo.

## webhook-retry-worker 401 — análise específica, sem execução
Baseline anterior observou 2 HTTP 401 v61, sem prova do token/header/versão corrente. Fonte actual aceita service bearer, x-cron-secret legado ou helper gerido; devolve 401 Unauthorized antes de claim quando nenhum é aceite. Também transforma helper gerido 500 (configuração ausente) em 401: candidato worker/authorization.ts preserva 500 e testa três credenciais válidas, inválidas/ausentes. NÃO integrado no worker activo. Logs sanitizados do operador necessários para distinguir ausência/incorrecto/configuração/gateway; não concluir causa do evento passado. Não executar worker nem expor headers/segredos.

## Proposta exacta de primeiro lote (separado)
Recomenda-se continuar a revisão do pacote EXISTENTE ../next/stripe-minimal: candidate.sql + rollback.sql + handler stripe-reconcile e helpers listados no SHA256SUMS desse pacote. Sem vídeo, quota, frontend, push, email, cobrança. Autorizar especificamente novas escritas de diagnóstico/claims e pausa/drenagem/retoma do MESMO job 11 mantendo 15 3 * * *; sem criar job. SQL precede função; canário natural autorizado, só GET Stripe, HTTP 200/errors=0/claim idle/sem duplicação. Rollback SQL só antes de claims; com histórico manter ledger e corrigir forward, não reactivar handler antigo que envia emails.

Lista operacional FINITA inalterada: backup UTC/restauro recuperável; artefacto/hash da versão activa e reversão; prova autoritativa de drenagem incluindo HTTP pendentes e callers manuais. Sem estas três provas + aprovação específica: NO-GO. Não repetimos SELECT nem inventamos capacidade de deploy selectivo.

| Lote | Preparação | Produção |
|---|---|---|
| Stripe mínimo anterior | GO revisão; testes independente preservados | NO-GO provas + aprovação específica |
| Vídeo/quota integrado | PARCIAL, testes núcleo PASS, bloqueios acima | NO-GO |
| Worker auth diagnóstico | GO testes puros, patch não integrado | NO-GO logs/version/aprovação |
| 46 push/contador divergente | Intocados; template anterior conservado | Não autorizado |

WillFlow 2.0 não concluído. Continuar exige créditos disponíveis; nada executa após esta resposta.
