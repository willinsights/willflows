# Independent WillFlow 2.0 quota preflight fix

Authorized 2026-11-18 following owner confirmation of backup.

Pre-change function pg_get_functiondef MD5: `be51bf6cac9f628f6c155a3f2ef5aa36`.

The existing Stripe writer stores **base + extra into storage_limit_bytes**. The old `check_storage_quota` adds `extra_storage_bytes` again. The patch changes **only** `v_total_limit := v_limit + v_extra` to `v_total_limit := v_limit`; authentication, return shape, ownership/security definer and default behavior are retained. Read-only baseline: 19 workspaces; none with nonzero extra currently, none exceeding total; no mismatched total/base+extra. Consequently the patch has no current allowance impact, but corrects future addons.

`candidate.sql`: guarded, atomic, minimal DDL; checks source hash and quota contract. `rollback.sql`: original exact function body, no table changes. Does NOT correct existing usage counter drift; video/quota migration remains NO-GO until reconciliation and provider validation. No frontend, R2, Stream, jobs, payments or video files changed.

## Aplicação verificada na produção

A alteração **foi aplicada** por uma transação SQL guardada, com autorização expressa do proprietário após declarar que existe backup. Verificação posterior via SELECT: `md5(pg_get_functiondef(...)) = 173cb661f72ca1ca31a6a597a5604686`, presença da regra `v_total_limit := v_limit;`, ausência da regra antiga, inconsistências de contrato = 0. A fonte SQL original encontra-se em `rollback.sql`.

A criação do ficheiro neste repositório NÃO publicou a função: a alteração foi feita diretamente através da ligação autorizada à base de dados. O PR deve ser usado como trilho de auditoria, não como instrução para reaplicar SQL automaticamente.

**Fora do âmbito:** reconciliação do contador divergente, migração da contabilidade de vídeo, R2/Stream, jobs, SQL de pagamentos. Estes permanecem sem aplicação em produção.
