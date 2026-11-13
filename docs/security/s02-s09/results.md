# Validation results — 2026-11-13 UTC

- Candidate SQL executed ONLY on empty local PostgreSQL 17.11 via Unix socket.
- Positive flows and 15 SQL assertions passed: exact seven-day signup/workspace
  trial, legitimate configuration/onboarding, administrative extension/conversion/
  block/unblock with four atomic audit rows, service billing update and service
  promo increment; static ACL checks, including all five protected billing fields.
- Specific rollback executed on that SAME synthetic database: completed, restored
  prior workspace UPDATE and anonymous promo EXECUTE, removed candidate RPC.
  Restoration was verified by catalog checks, not vulnerability probes.
- Six new mocked caller tests and two existing workspace-subscription tests passed.
- Existing user-subscription suite failed before running any tests due to a
  pre-existing Vitest hoisting error; no unrelated test files changed.
- Static transaction/scope/caller checks passed; current signup has no direct
  promotional-consumption caller, and administrative hooks no longer direct UPDATE.
- Automatic preview build reports `build OK` after frontend edits.
- Local database was stopped. No production write, SQL application, Edge Function
  deployment, publication, client-data access or exploratory vulnerability test.
- Scope limitations: local schema is focused on affected objects, not a full
  production clone; external billing/auth flows and deployed Edge Function versions
  remain unverified. Candidate frontend administrative RPC requires future SQL
  application before publication. Unrelated historical roadmap items were not worked.