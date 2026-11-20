# PR2 visual validation and cutover disposition — 20 November 2026

## Executed visual evidence

The real `src/pages/public/VideoApproval.tsx` and shared HLS hook ran in Chromium at 1280 × 1800. A fresh anonymous context contained no application authentication storage keys. Browser API requests were routed to a loopback-only candidate backend; all unrelated external requests were blocked (12), while real signed HLS requests were permitted to videodelivery.net.

The backend executed the candidate `approvalData` handler and `authorizedPlayback`/`providerPlayback` signer. The actual candidate feedback entrypoint was evaluated after replacing only its imports and runtime dependencies with isolated adapters. Rows persisted in a new private SQLite fixture, not in production. Only exact operationId/name matches for the two existing canary videos were selected; both remained ready and signed-only. No new ingestion or client media GET occurred.

| Version | currentTime observed | Duration | Decoded frames | Frame callbacks | Dimensions | Media error |
|---|---:|---:|---:|---:|---|---|
| 2, green | 0.205427 s | 0.499999 s | 6 | 2 | 160 × 90 | none |
| 1, red | 0.167641 s | 0.499999 s | 10* | 4 | 160 × 90 | none |

*The browser frame counter can be cumulative across a reused video element; the distinct red screenshot, positive frame callbacks reset for each source and advancing currentTime independently prove the second source decoded. Do not interpret 10 as the clip's exact frame count.

Visual inspection confirmed green and red frames, the comment sidebar and the final approved page. The same fixture approval URL was retained through both version selections and reloads. Exactly one comment and one approval were persisted and read back after reload. Reader HTTP 200 (five requests); comment and approval HTTP 201 each; zero page runtime errors. Signed URLs, provider credentials and approval links were not printed or saved in evidence.

This is real provider/browser playback with candidate server logic and durable fictitious fixture storage. It is **not** a deployment of candidate SQL into a hosted isolated Cloud database, nor a complete upload/replacement/retention test against its PostgreSQL triggers. The fresh fixture backend had no retention consumer and no production connection. Existing green automated suites were not repeated.

## Individual counter inventory — read-only

### Responsive follow-up

Checked both real signed sources at 390 × 844 and 1280 × 1800 in light and dark themes, including comment submission and the approved page in all four contexts. Initial mobile header overflow clipped the approval action. Corrected only the staged `frontend/pages/VideoApproval.tsx`: stacked mobile header, wrapping actions/name form, bounded comment column and wrapping file metadata. Replayed all four contexts through the candidate page using the preview compiler; both versions decoded, all four comment/approval flows completed, and horizontal overflow was false in every context. Inspected all twelve screenshots (eight video states and four approved states). Active frontend remains unchanged. This full staged page preserves the current PR11 behavior and must be explicitly mapped to `src/pages/public/VideoApproval.tsx` by the later release overlay, not silently copied during this blocked cutover.

One divergent scope, 54 active version rows. Stored counter: **92,143,699,665 bytes**; active version accounting: **16,862,211,040 bytes**; unexplained legacy difference: **75,281,488,625 bytes**. Zero unverified row sizes.

Each active R2 reference was checked individually with HEAD: **54 exact byte-size matches**, zero missing, mismatched, unreferenced or unavailable objects. Exact Stream UID metadata checks: **54 existing references**, all still public (`requireSignedURLs=false`); no provider settings changed. These legacy references are distinct from the two private synthetic canary UIDs. Active files were not downloaded. Per-version evidence was hashed and retained only under temporary private sandbox staging; no names, workspace identifiers or customer IDs appear here.

This proves the active referenced byte inventory, not the cause of the historical counter divergence or the physical disposition of soft-deleted assets. The changed baseline demonstrates why the assembler must recheck its fingerprint under NOWAIT in a stable maintenance window. No counter was overwritten and no generic sum was applied.

## Concrete staged barrier

- `upload-barrier.sql`: separate pre-cutover candidate, private singleton state with explicit service grant, RLS and service-only SECURITY DEFINER reader. Missing row defaults closed. No production migration.
- `_shared/upload-barrier.ts` and `_shared/runtime.ts`: issuance returns HTTP 503 `UPLOAD_MAINTENANCE` unless the server explicitly permits issuance. Processing, recovery and abort remain available for drain. Candidate paths only; no active function edited.
- Five targeted Deno tests passed: explicit open, explicit closed, absent state, query failure and thrown failure.
- Disposable PostgreSQL Unix-socket test passed four groups: absent state closed, explicit service open, anonymous/authenticated denied, reversible close/reopen. No hosted database involved.
- This candidate barrier is not sufficient for old active issuers: before operational use, apply an equivalent bridge to **every active issuance entrypoint**, obtain a recorded maintenance window and verify old signed PUT/ticket lifetimes and HTTP requests. Do not deploy the strict new issuer before the coordinated durable-operation schema exists.

## Precise operational stop

Job6 remains active hourly. Catalog read confirmed `cron.alter_job(bigint,text,text,text,text,boolean)` exists, but **the available database executor has no EXECUTE privilege**. Managed schedule tools expose update/delete/create, not reversible active=false on this legacy schedule. No delete/recreate workaround was performed. Only an operator with the existing authorized cron ownership can pause this job, preserve its definition privately and provide its exact restoration evidence; no privilege widening is proposed.

`cleanup-expired-videos` function logs returned no entries. Therefore HTTP/provider drain is not proven. Pausing a dispatch alone would not cancel an already running deletion. Installing accounting while that conflicting deleter may run remains unsafe. No job was paused, reopened or invoked; job12 and all unrelated flows untouched.

The 54-entry SHA256 manifest passes. Coordinated SQL produced only by the assembler remains byte-identical: `71856b8329f99e8dfce80a86e297186c31e9253a2041a759acc15b604c95e560`. The separate barrier is deliberately not silently appended to that migration. Preview harness build log: build OK. No manual active application build, hosted migration, active Edge Function deployment, quota write or frontend publication occurred.

**Next executable production step is gated:** operator-controlled upload issuance bridge/window + reversible job6 pause + HTTP drain evidence, followed by a fresh reviewed per-version counter fingerprint under the existing assembler guard. Until then, retain the candidate; do not claim PR2 or WillFlow 2.0 activated.