# G04/S03 — candidate only, 13 November 2026

## Scope and callers
- `src/hooks/useVideoVersions.ts`: upload and replacement call `r2-upload-url`, PUT the object, then `stream-process-video`. Now forwards `uploadTicket`; replacement issuance also receives `replaceVersionId`.
- `src/hooks/useVideoApproval.ts`: direct token creation/deactivation and internal approvals remain unchanged. Candidate BEFORE triggers validate/derive their project/task associations.
- Public review calls `get-video-approval-data`, `submit-video-feedback`, `delete-video-comment`; download calls `video-download-url` through `useVideoDownload`.
- `_shared/video-context.ts` resolves actual project/task/workspace, task-first token scope, active/expiry state and canonical persisted keys. Task-only historical tokens derive the project. Project links remain project-wide, including task versions. Existing task keys and project-only `undefined`/`null` keys remain readable when the persisted version context is coherent.
- `_shared/video-upload-ticket.ts`: HMAC receipt binds new key, authenticated uploader, workspace/project/task, filename, size, replacement target and expiration. Uses the existing server credential in a domain-separated HMAC; never exports or logs that credential. Receipt is not a login token. No new secret is required.
- Processor validates receipt and signed HEAD content-length before mutation/provider copy; replacement validates persisted context/key, checks its write and confirmed Stream state before old-media cleanup. Upload roles remain active admin/edicao. Download keeps active-member access and public token access.
- Review, feedback and download verify version scope; comment deletion no longer falls back from a task token to the whole project. Review filters all queries by workspace/project/task and checks referenced versions. Stream delivery remains unchanged; signed Stream playback and public provider URLs are outside this lot.

## SQL and reversal — NOT applied
`candidate.sql` is transactional and outside migration journals. Adds one SECURITY DEFINER function with `SET search_path=public`, `is_service_role() IS NOT TRUE` for asset writes, and four BEFORE INSERT/UPDATE triggers for versions/tokens/comments/approvals. Metadata-only updates remain allowed under existing RLS. Associations of comments/approvals are derived from the real version; token task-only associations derive the project; replies require the same version/workspace. New/moved version assets are service-only. Existing rows are neither scanned nor rewritten. Existing grants, policies, service helpers and subscription/storage/retention triggers are not replaced.

`rollback.sql` removes only the four new triggers and their new function. Catalog confirmed these names absent; no previous definition/ACL is overwritten. `catalog-before.txt` and `acl-before.txt` contain catalog definitions/ACLs only, no customer data. Re-read catalog immediately before any future application.

SHA-256 candidate: `f919f32afc6f5a53a507a5d01b6b9bc5db4888d4b990ca870861af5ef45d29ed`

SHA-256 reversal: `761e78333b18a1ee156053dca4d17b9911b1e557276a65cb37567afdc8437800`

## Validation
- `bun x vitest run --config docs/security/g04-s03/vitest.config.ts`: **13/13 positive tests**. Shared helpers and actual handler entrypoints compiled in-memory; remote imports replaced with local dependencies, fetch blocked except explicit fictitious Stream response. Covers upload issuance, processing, replacement, authenticated/public download, legacy keys/task links, project-wide feedback, approval, review and comment removal.
- `python3 docs/security/g04-s03/run-positive-tests.py`: PASS. Disposable PostgreSQL 17, Unix socket, TCP disabled, cleaned up. Tests legitimate service upload/replacement, authenticated token/comment/reply/approval/metadata, ACL/BEFORE catalog assertions, and reversal. Minimal synthetic schema and permissive fixture RLS, **not equivalence to complete production RLS**.
- `deno check --no-remote` on the two shared files: PASS. `git diff --check`: PASS. Automatic frontend build: build OK. Full deployed Deno dependency resolution/provider behavior was not tested.
- No adversarial cases, vulnerability exploration, customer records, business endpoint calls, deployments, publishing or production SQL writes.

## Deployment order — future authorization required
1. Deploy additive `r2-upload-url` first (returns receipt; old consumers ignore the extra response field). Do not deploy the strict processor yet.
2. Publish the updated upload/replacement caller, confirm the served bundle forwards the receipt, and require refresh/drain of older tabs and in-flight uploads. Old upload responses have no receipt; those uploads must be restarted. A server fallback accepting unsigned uploads is deliberately not included.
3. Deploy strict `stream-process-video` with shared dependencies; then deploy public review/download/feedback/comment handlers. Apply the SQL candidate only after catalog recheck and verification of real trusted writers. Until SQL is authorized/applied, direct table paths retain existing structural exposure; candidate code is not a claim of production remediation.
4. Verify definitions and deployment metadata/read-only evidence under a separately authorized release procedure. Reversal of SQL uses the specific file; roll back processor before frontend/signer if restoring the old upload contract. Existing new five-segment keys are readable by the candidate readers; avoid rolling readers back without evaluating that compatibility.

## Active versions
The project metadata tool exposes no function hashes/versions/deployment times. Catalog search exposed no deployment/edge-function version relation. Active versions of the six changed functions are **unknown**, not proven by frontend SHA. `stream-update-video`, `stream-get-status` and cleanup functions were mapped but not changed/deployed; their active versions are also unconfirmed.

## Boundaries
Ticket receipt is time-limited, not a persisted one-time intent; exactly-once/replay/storage-accounting changes are not included. Concurrent task/project reparenting and provider-side content authenticity are not claimed solved by mocked tests. Future SQL/deployment must be evaluated as a separate release; no production correction has been made here.