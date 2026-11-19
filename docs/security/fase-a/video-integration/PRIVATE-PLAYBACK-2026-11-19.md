# PR2 private playback correction — 19/11/2026

## Concrete staged change
- Upload ingestion and Stream settings updates now require signed URLs. No active function replaced.
- Shared provider signer issues 15-minute tokens only after version/context authorization. Workspace path requires an active membership and validated application user; public review path requires an active, unexpired token covering the persisted version's resolved project/task/workspace.
- Authorization and version UID are checked again after provider I/O; revoked access and superseded versions cannot release a token. All playback and approval responses use `private, no-store, max-age=0` with `Vary: Authorization`.
- New staged `video-playback-url` handler; no credentials/provider response bodies logged or returned. Temporary playback URLs are deliberately returned only to authorized clients, never stored in database rows.
- Staged workspace hook refreshes original/corrected playback separately every ten minutes. Staged `VideoProductionTab` passes the authorized URL without the old UID override. Existing legacy Storage signing remains unchanged.
- Public approval reader signs ready original/corrected Stream versions while preserving link/comment/approval behaviour and legacy Storage fallback. Expired playback can be renewed through the existing availability refresh action.

## Executed evidence
- 72 isolated Vitest regressions PASS (9 new private-playback tests): active membership, scoped client link, missing membership, inactive/expired/cross-workspace link, legacy fallback, revocation during signing, provider expiry and no-public-cache contract.
- Candidate Deno checks PASS for playback endpoint, approval endpoint, ingestion runtime and settings update.
- Isolated frontend overlay build and TypeScript native check PASS. Includes the staged workspace page, not just the hook.
- Browser fixture: same approval link, four reads, one comment and one approval, approved UI confirmed; external services blocked.
- **Real provider reads, no new ingestion:** exact operationId/name lookup of only the two existing PR2 canary fixtures. Both `readyToStream=true`, `requireSignedURLs=true`; each ready on first poll. Shared candidate signer used for both. Master/variant playlist GET **200**, first media segment GET **200**, **1,064 bytes** per fixture. Tokens and signed URLs stayed in process memory and were not printed, persisted or added to this report. Existing provider UIDs were not changed.
- Manifest includes 51 checked files; SQL component hashes and NOWAIT guards unchanged. No quota, job12, worker, billing, cleanup, live handlers or published frontend changes.

## Limits
The real GET validates authorized provider playback transport, not decoded browser video or an authenticated application session against newly deployed candidates. Candidate authorization is covered by isolated tests; this endpoint is intentionally not deployed while cutover remains blocked. Other production release gates from ACTIVATION-2026-11-19.md (quota review, writer/cleanup drain and operational rollback) remain open. Do not describe PR2 as operationally activated.

## Deployment dependency added
Deploy the staged `video-playback-url` endpoint and approval signing reader together with the staged frontend hook/page, before any new signed-only ingestion. Keep Stream settings updater signed-only. Never copy the staged billing handler as part of this change.