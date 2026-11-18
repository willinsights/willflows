# Independent WillFlow 2.0 quota preflight fix

Authorized 2026-11-18 following owner confirmation of backup.

Pre-change function pg_get_functiondef MD5: `be51bf6cac9f628f6c155a3f2ef5aa36`.

The existing Stripe writer stores **base + extra into storage_limit_bytes**. The old `check_storage_quota` adds `extra_storage_bytes` again. The patch changes **only** `v_total_limit := v_limit + v_extra` to `v_total_limit := v_limit`; authentication, return shape, ownership/security definer and default behavior are retained. Read-only baseline: 19 workspaces; none with nonzero extra currently, none exceeding total; no mismatched total/base+extra. Consequently the patch has no current allowance impact, but corrects future addons.

`candidate.sql`: guarded, atomic, minimal DDL; checks source hash and quota contract. `rollback.sql`: original exact function body, no table changes. Does NOT correct existing usage counter drift; video/quota migration remains NO-GO until reconciliation and provider validation. No frontend, R2, Stream, jobs, payments or video files changed.
