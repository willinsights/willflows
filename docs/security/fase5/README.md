# Automation retries — candidate only

No active function, schedule, SQL or customer record is changed by this candidate.

The worker passes its persisted job ID and workspace. The executor validates the
persisted job context before using deterministic per-job, automation, channel and
recipient delivery identities. No timestamp-based deduplication is used.

Email success/suppression is checked by exact message ID. The provider receives
the same idempotency key on retry. In-app notifications use a deterministic UUID
and propagate persistence errors. Email failure causes a queued invocation to
return 500; the worker checks completion errors rather than claiming success.

Tests execute the real candidate executor with in-memory database/email doubles;
all network requests throw. These are not hosted service acceptance tests.

Release remains separate: inspect notification INSERT triggers and email provider
idempotency retention before deployment. Simultaneous notification inserts can
produce a uniqueness error; a later retry checks the persisted ID. Exactly-once
delivery after an external provider's idempotency retention expires is not claimed.
Deploy executor first, then worker only after positive synthetic acceptance;
rollback worker first, then executor using exports of the actual active versions.
No SQL migration is needed for the proposed deterministic notification primary key.