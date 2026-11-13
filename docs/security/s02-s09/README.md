# S02/S09 candidates — NOT applied

## Status and deployment order
These files are intentionally outside all migration directories. No migration,
function deployment, production data update or frontend publication was performed.
Before applying: compare the live catalog against `catalog-before.json`, recheck
all internal callers, and obtain explicit production authorization. Apply SQL
before publishing the modified administrative callers; until then the new RPC
does not exist in production and those candidate administrative controls will fail.

## Exact protected fields
- `workspaces`: `subscription_plan`, `subscription_status`, `stripe_customer_id`,
  `stripe_subscription_id`, `trial_ends_at`. Direct INSERT is removed from public,
  anonymous and authenticated roles; workspace creation stays via the existing RPC.
- Identity and server-control columns `id`, `created_at`, `onboarding_completed`,
  `onboarding_business_type`, `onboarding_completed_at` also receive no direct
  client UPDATE grant. Onboarding remains through its existing authorized RPC.
- Retained configurable UPDATE columns: `name`, `slug`, `country`, `currency`,
  `timezone`, `locale`, `logo_url`, `updated_at`, `vat_rate_default`, `vat_regime`,
  `vat_country`; existing workspace-admin RLS is unchanged.
- Limits/benefits inventoried but NOT modified: `workspace_storage` fields
  `storage_limit_bytes`, `base_storage_bytes`, `extra_storage_bytes`,
  `stripe_addon_subscription_id`, `addon_tier`; `user_subscriptions` fields
  `subscription_plan`, `subscription_status`, `stripe_customer_id`,
  `stripe_subscription_id`, `trial_ends_at`, `current_period_end`.
  Their catalog policies already limit writes to the service. No extra client
  access, trigger bypass, default change, trial extension or price change is added.

## Trusted paths and caller map
- `create_workspace_with_admin`: authenticated identity; protected
  `system_admins` decides the existing Studio exception; ordinary workspace trial
  remains exactly seven days. All billing values originate in the function.
- `create_trial_subscription`: existing Auth lifecycle trigger creates the
  ordinary seven-day user subscription. Neither trigger nor function is changed.
- `complete_workspace_onboarding`: existing active-admin check and owner-executed
  settings-only UPDATE. Not changed.
- `stripe-webhook`: verified Stripe event (or existing authenticated internal
  retry path), then a dedicated service client writes workspace/subscription/addon.
- `stripe-reconcile`, `check-subscription`, `customer-portal`: existing service
  clients retain privileges. This batch does not certify every external billing
  decision; their deployed versions remain unconfirmed.
- `create-test-accounts`, `reset-billing-data`: existing protected administrator
  entrypoints with separate service clients; preserved, not invoked.
- `src/pages/app/Configuracoes.tsx`: name, country, currency, timezone and VAT
  configuration stay writable under existing RLS. Logo/name updates also remain.
- `useAdminTrials` and `useAdminWorkspaces`: candidate callers now request an
  action rather than writing dates/status. New `admin_manage_workspace_billing`
  validates the requesting identity against protected `system_admins`, locks the
  workspace, calculates extension from max(now,current end), and audits atomically.
  Existing convert/block/unblock semantics are preserved. No editable user role,
  browser date or service-role test based on definer ownership is used.
- Other direct browser writes to `user_subscriptions` (e.g. cancellation in
  `useAdminBilling`) were already not allowed by its production RLS. They are
  unchanged; repairing those workflows is not silently included in this batch.
- Browser storage accounting in `useWorkspaceStorage` was already constrained by
  service-only write policies. No new client allowance or video change is added.

## S09 and registration
Search of `src/` and `supabase/functions/` found **no executable caller** of
`increment_promo_code_usage`; only the generated type declaration remains.
`Auth.tsx` already keeps promotional codes unavailable under S01 and does not
extend trial or increment counts. Registration is unchanged: seven normal days,
no newly activated promotional benefit or metadata-derived entitlement.
The function keeps its signature/void return and exact counter semantics, adds
the hardened S01 service-context check, and removes PUBLIC/anon/authenticated
EXECUTE. Service EXECUTE remains; no new redemption endpoint is invented.
`validate_promo_code` and the broader future redemption design are unchanged.

## Preservation and reversal
`catalog-before.json` contains definitions, owners, ACLs and policies only;
no personal records or credentials. Capture SHA-256:
`e353694ddddf679fc0c2c5680885a2a739cc767ddf48375332952dffaad04a90`.
`rollback.sql` removes only the new RPC and restores the captured counter function
and affected grants. It deliberately restores the old permissive posture and
requires separate authorization; never automatically use it after an incident.
Existing function owners and non-client maintenance ACL entries are not altered.

## Validation
`run-positive-tests.py` targets only `/tmp/s02-s09-pg`, port 55439, via Unix socket;
no production address or credential is accepted. PostgreSQL 17 local fixture uses
exact captured definitions for existing create/trial/onboarding/admin functions,
synthetic tables/identity and a stub permission initializer. It is **not a full
production schema equivalence test**, nor a vulnerability/external-service test.
Positive flows: signup seven days; ordinary workspace seven days; name/config;
onboarding; administrator extension/conversion/block/unblock with atomic audit;
service billing update and one service promo increment. Static ACL checks cover
all five billing fields, permitted name UPDATE and promo EXECUTE roles.
Vitest caller tests simulate RPC, block network, verify returned server date,
four administrative actions and failure propagation.

Commands:
```text
python3 docs/security/s02-s09/run-positive-tests.py
bunx vitest run src/lib/__tests__/adminWorkspaceBilling.test.ts src/hooks/__tests__/useWorkspaceSubscription.test.tsx
```
The unrelated existing `useUserSubscription.test.tsx` suite fails during import:
its mock references `mockSupabaseClient` before initialization (zero tests run).
It is reported, not edited outside this batch. Preview build is automatic; no
manual build or authenticated production UI action is used for candidate checks.