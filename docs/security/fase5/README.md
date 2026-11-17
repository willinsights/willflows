# Automation retries — activated 2026-11-17

Executor and worker are now deployed. Schedules, SQL and customer records were not manually changed. No old/dead job was replayed.

The worker passes its persisted job ID and workspace. The executor validates the
persisted job context before using deterministic per-job, automation, channel and
recipient delivery identities. No timestamp-based deduplication is used.

Email success/suppression is checked by exact message ID. The provider receives
the same idempotency key on retry. In-app notifications use a deterministic UUID
and propagate persistence errors. Email failure causes a queued invocation to
return 500; the worker checks completion errors rather than claiming success.

Tests execute the real candidate and active executor/worker with in-memory database/email doubles;
all network requests throw. These are not hosted service acceptance tests.

Catalog inspection confirmed compatible columns, atomic queue claims and no custom notification INSERT triggers. Fifteen offline tests passed, including suppression, completion failure and retry without duplicate notifications. Simultaneous notification inserts can
produce a uniqueness error; a later retry checks the persisted ID. Exactly-once
delivery after an external provider's idempotency retention expires is not claimed.
Deploy executor first, then worker only after positive synthetic acceptance;
rollback worker first, then executor using exports of the actual active versions.
No SQL migration is needed for the deterministic notification primary key.

## Activation evidence and rollback

- Executor deployment succeeded first; submitted source/settings SHA-256: `51025a6989d7daae0106521fc1ab3b1624534a2a77695bf7f2130bd5e68edb93`.
- Worker deployment succeeded next; submitted source/settings SHA-256: `1d7d20a3662b07396714d71c7658f6f2e0d35697026da8ef1f4d79513324a30d`.
- Build telemetry: build OK at 2026-11-17 19:32:06 UTC.
- These deployment receipts are not an independent live-version attestation.
- Queue aggregates: 345 done, 147 dead, no pending/running jobs. Last observed automation email accepted on 2026-11-13; 36 sent in the preceding seven days. This is historical evidence, not post-deploy delivery confirmation.
- No new production event was triggered for testing. Real post-deploy delivery remains unobserved; boot/shutdown logs alone do not prove business success.
- Rollback: restore `rollback-before-activation/process-automation-jobs.ts` to its original entrypoint and deploy worker, then restore `rollback-before-activation/execute-automations.ts` and deploy executor. These are saved pre-change repository sources, not exports independently verified against the previous live deployment. Remove the new shared helper only after both rollbacks succeed.