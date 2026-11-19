# PR2 provider canary — 2026-11-19

Executed against existing managed R2/Stream credentials, without modifying application video or quota rows, worker, jobs, billing, or migration PR2.

- Two synthetic H.264 MP4 fixtures: 1754 bytes each, 0.5 seconds, 160x90.
- Prefix: `willflow-pr2-canary/159c81d4-2939-4b5b-b98c-9a8dcf0bd556/`.
- Each fixture: PUT 200, HEAD 200 with exact size; conditional snapshot copy 200 with matching ETag; destination overwrite 412; incorrect source ETag 412; Stream ingest accepted; `requireSignedURLs=true` confirmed; short-lived playback token issuance confirmed; two operationId searches each found exactly the same single UID.
- 18 sanitized check entries persisted privately. No signed URLs or credentials returned or logged by canary code. The issuance queue carries only a short-lived operation-specific authorization, not a persistent provider/worker credential.
- Claim consumed before provider work; singleton prevents any second issuance. Expiry 90 seconds. No automatic provider retry after uncertainty.
- Three Deno authorization tests PASS; six PostgreSQL17 isolated ACL/digest/replay/expiry/singleton checks PASS; Deno check PASS.
- Applied only additive `0009_pr2_video_canary_single_dispatch.sql`; retained private evidence and consumed dispatch. No PR2 quota migration activated.
- Canary deployed source SHA256: `1eb2c1b0c7b8ce6e310574ccfda231f1064d84b1b11445170e3345c1da7c5bad`.
- Active canary source removed and deployed function deleted after completion; endpoint OPTIONS 404 confirmed.
- Synthetic R2 sources/snapshots and two private Stream assets retained, not deleted. Retained provider storage may incur usage charges; no subscription purchased.

## Limits

This verifies provider adapters, not full frontend upload/approval or restored database integration. Signed playback token issuance was checked, not decoded video playback. Stream transcoding completion was not awaited. Candidate runtime currently contains `requireSignedURLs:false`; this canary deliberately uses true, and production privacy requires a separately reviewed candidate correction. No client material was read or overwritten.

Existing preview build errors involving generic Record<string, unknown> updates were observed; frontend was not changed in this narrowly scoped operation and a full successful build is not claimed.