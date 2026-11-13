-- Specific reversal of the additive candidate; no previous definitions or ACL replaced.
BEGIN;
DROP TRIGGER g04_s03_video_context ON public.video_versions;
DROP TRIGGER g04_s03_video_context ON public.video_approval_tokens;
DROP TRIGGER g04_s03_video_context ON public.video_comments;
DROP TRIGGER g04_s03_video_context ON public.video_approvals;
DROP FUNCTION public.g04_s03_video_context_guard();
COMMIT;