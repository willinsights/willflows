# Bloqueios WillFlow 2.0 — candidatos isolados v1

Base `ee4c57fd`, 17/11/2026 UTC. Nada aplicado/publicado. Fontes em `supabase/functions` dentro desta pasta NÃO são activas. Editar os caminhos activos pode implantar automaticamente; não copiar antes da autorização específica e drenagem comprovada.

## Matriz go/no-go
| Área | Candidato e prova isolada | Produção | Condição de passagem |
|---|---|---|---|
| Quota | Trigger conta principal+substituição só de linhas não eliminadas; hard delete após soft delete debita zero. Lock transaccional BEFORE STATEMENT comum a todas as escritas de vídeos/quota. RPC cleanup só marca; trigger debita. Corridas e rollback testados | **NO-GO** | Auditar/reconciliar baseline real, capturar definições/ACL, cortar escritores antigos; ensaio de carga e cascatas globais |
| Push | Claim único por ID persistido, token/fencing, máximo 3 tentativas incluindo histórico; retry só antes de enviar ou 429 explícito; timeout/5xx uncertain sem reclaim. Código entrega + PostgreSQL real em fixture | **NO-GO** | Política autorizada da fila antiga (nenhum replay aqui), conferir constraints/status reais, confirmar transporte/credenciais sem as revelar, drenar worker antigo |
| Stripe | Índice único parcial por subscrição aberta + constraint de identidade; UPSERT DO NOTHING transaccional, um vencedor entre oito; nova divergência após resolução mantém histórico | **NO-GO** | Rever duplicados/nulos existentes sem os limpar; conferir schema e campos obrigatórios; desactivar email nesta etapa; preservar enriquecimento antes de implantação |
| 5 crons | Claim persistente por handler; todos os candidatos usam wrapper. Oito callers têm um dono; crash/erro bloqueiam por running/uncertain | **NO-GO** | Pausa+drenagem/versão activa verificáveis e cutover sequencial suportado; handlers antigos não usam claim |

GO significa **continuar preparação isolada**, não produção. WillFlow 2.0 não concluído.

## Quota: escolhas e limites reais
- Fonte única passa a trigger. Cópia de `stream-process-video` retira débitos/créditos explícitos de `add_workspace_storage`; hook isolado `frontend/useWorkspaceStorage.ts` conserva API mas callbacks só invalidam cache, nunca escrevem contador. Recalcular também apenas actualiza leitura: recalcular baseline exige operação própria autorizada. Não muda limites comerciais.
- `guard_storage_counter` bloqueia leituras-e-escritas antigas e RPC add_workspace_storage directas; configuração/add-ons sem alteração do contador continua permitida. Não altera ACL de utilizadores. Não é autorização para activação: clientes antigos podem ver erro, embora contador não corrompa.
- Lock global conservador reduz throughput, mas elimina inversão quota→vídeo / vídeo→quota nas operações testadas. Segurança serializa também metadata; optimização por workspace requer novo desenho provado. Cascatas ou transacções que primeiro bloqueiem outras tabelas podem ainda criar deadlocks: PostgreSQL aborta uma transacção, não se promete deadlock-free em toda a aplicação.
- Tamanhos negativos/missing quota/excesso abortam conjuntamente linha e contador. `is_deleted NULL` histórico conta como activo. Workspace de versão é imutável. Idempotência de mesma linha/actualização é provada; repetir um upload criando OUTRA linha/novo UUID não é deduplicado por este trigger. Exige chave de upload e registo de operação em fase de vídeo própria.
- Baseline histórico pode já contar uploads duas vezes; nenhum backfill automático. Antes de activar: comparar aggregate de activo principal+substituição versus quota, sem alterar dados nesta preparação.

## Push e recuperação
- Identidade exacta é ID da fila, não tag/título (mensagens distintas não devem colapsar). Sem garantia contra produtor gerar dois IDs para o mesmo evento: precisa identidade de evento persistida e política aprovada. Não se infere igualdade por conteúdo.
- `reserved` após crash e `uncertain` após resposta ambígua não expiram. Evita dupla entrega, aceita possível perda de uma entrega. Reconciliação só com evidência do fornecedor/decisão autorizada; nunca reset automático. 429 é rejeição explícita, retry após 5 min; tentativas já existentes contam. 404/410 terminal, não apaga preferência real.
- Código falha se conclusão não persistir, mantendo claim. Estado da fila e ledger actualizados numa transacção. Push desactivado por defeito (`PUSH_DELIVERY_ENABLED` ausente → 503); não definido em produção.

## Stripe
- Só `subscriptions.retrieve` na cópia; nenhum método de cobrança/alteração. Registo via RPC parametrizada. NOT VALID evita varrer histórico, mas novos nulos abertos são recusados; DO aborta se identidades existentes inválidas/duplicadas. Não corrige dados reais.
- RPC mínima guarda status/tipo, não associa automaticamente user/workspace nem sobrescreve detalhes existentes; esta perda de enriquecimento é incompatibilidade **documentada, NO-GO** até preservar contrato autorizado com typed payload e teste de FK. Não afirmar package pronto para produção.
- Email permanece desligado; corpo notify=true não activa envio nesta preparação. Wrapper bloqueia overlap apenas entre candidatos novos.

## Sequência concreta sem duplicação
1. Conferir metadados, hashes, fonte activa exportável, backups UTC (inventário não acessível por ferramenta) e preservação de ficheiros separada; BD backup não inclui vídeos. Não fazer dump/restore aqui.
2. Aprovar pausa dos jobs individuais + todos os escritores de quota durante janela; confirmar zero pedidos em curso/pending. Pausa não cancela HTTP já disparado. Sem prova de drenagem, **parar**.
3. Capturar definições/ACL anteriores e baseline específico. Aplicar SQL phase-A e hardening só com hashes/ordem aprovados, via migração transaccional. Package não é aditivo puro: troca trigger e protege contador, requer revisão incompatível. Não dividir SQL autorizado silenciosamente.
4. SQL antes de funções dependentes; implantar cópias por nome individual, hook cliente antes da revogação comportamental efectiva quando possível; manter limpeza/push desactivados. Quota requer janela conjunta porque a troca de escritores não é rolling-compatible.
5. Manter os mesmos schedules se transporte antigo válido. Para converter: antigo pausado→drenagem→retirar antigo→confirmar ausência→criar único gerido mesmo nome/frequência. Há janela sem execução, não overlap. Ferramentas não provam conversão atómica, contratos antigos/versões/HTTP não verificáveis; não escrever SQL HTTP manual nem criar paralelo.
6. Aprovação específica para retoma por job e evento natural. Cleanup `true` é autorização destrutiva SEPARADA; push `true` pode escoar fila antiga, exige política/canário específico. Stripe sem emails/sem cobranças; nada invocado nesta fase.

## Monitorização / rollback
Contagens agregadas de claim/state, 5xx, stale token, quota, estados SQL; sem payload/endereço/token. STOP por baseline divergente, erro não reconciliado, uncertain, alteração de catálogo ou versão desconhecida. Não declarar 401 sem log HTTP.
`rollback.sql` é travão executável, não reversão fictícia: bloqueia histórico/incerteza e alteração de semântica sem baseline. `rollback-sources` conserva definições do editor, não versão activa comprovada. Reversão operacional segura: pausar/drenar, desligar cleanup/push, manter ledger/claims/constraint para evitar repetição, corrigir forward. Repor quota antiga exige plano específico de baseline; não repor valores cegamente. Código antigo de envio nunca restaura depois de claims. Não ressuscita vídeos eliminados.

## Testes
`python3 .../hardening/tests/postgres.py`: PostgreSQL 17 socket Unix privado sem TCP e env produtivo; SQL real, integra delivery/wrapper com RPCs reais e provider fictício, fetch bloqueado; fixture destruída no finally.
`bun x vitest run --config docs/security/fase-a/hardening/vitest.config.ts`: 8 testes novos. Suite anterior: 16 regressivos. `deno check --node-modules-dir=none`: 7 candidatos aprovados. Dependências públicas obtidas para verificar; não chama API de app/Stripe/storage.
Resultados registados em EVIDENCE.txt; hashes em SHA256SUMS. Não houve alteração frontend activa: nenhuma página nova a validar no browser. Enriquecimento Stripe, produtor push/UUID upload, carga/cascatas e catálogo real desta revisão continuam verificações pendentes explícitas.

## Autorizações específicas futuras
Não pedidas para executar agora: SQL/hash+risco de incompatibilidade, pausa/drenagem por job/escritor, implantação por função/cliente, reconciliação baseline, tratamento de fila antiga/incerteza e activação destrutiva. Antes de qualquer produção apresentar plano exacto e rollback compatível; actual autorização cobre apenas candidatos.