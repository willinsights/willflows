# Selected security fixes — 20 November 2026

Only the four findings selected by the owner were reviewed for remediation. No other finding was fixed or ignored.

## Applied

- Invitation acceptance now requires the authenticated account's `email_confirmed_at`, then verifies the invitation email hash. Lovable Cloud email auto-confirm was explicitly disabled through the managed auth configuration. Existing memberships were not modified. Migration `0011_require_verified_invitation_email.sql` applied to the project database and its definition verified by catalogue read.
- The automation executor reads the workspace's server-owned subscription plan before loading/running automations. Only Studio is eligible, matching the existing feature catalogue. This applies to authenticated members, trusted internal calls and queued retries. An ineligible queued event completes with zero effects rather than generating repeated failing retries; lookup errors fail closed. Existing delivery identities and suppression behaviour were preserved. Only `execute-automations` was explicitly deployed; submitted bundle hash: `476007f444274e8a8c129f24aea7b2789a8b2cbc0c1ce07eadbe03b0d1037aa1`.

Both corresponding selected findings were marked fixed through the finding-management tool.

## Awaiting explicit confirmation

Campaign test recipients and automation test recipients are currently user-entered addresses. Restricting those to the sending administrator's verified address would remove an existing external-recipient feature. The owner was asked to confirm this restriction before changes to those two handlers. Both selected findings remain active; neither was ignored or marked fixed. No test email was sent.

## Verification

- 17 tests of the actual automation executor/worker with fictitious dependencies passed, including non-Studio internal calls, authenticated member requests with forged plan claims, entitlement lookup failure, Studio sends, suppression and retry deduplication.
- Five disposable PostgreSQL fixture checks passed for the actual invitation migration: unverified mailbox rejection without consuming invitation, mismatched confirmed email rejection, matching confirmed email acceptance preserving role, consumed token rejection, anonymous rejection. Private Unix socket only, no hosted connection or real accounts.
- Automatic application build passed. No frontend publication, video cutover, cron invocation, customer record edits or outbound emails were performed for these fixes.
- The seed does not define the changed function or require updates.

These checks are targeted regression tests, not penetration testing or a declaration that all other security issues are resolved.