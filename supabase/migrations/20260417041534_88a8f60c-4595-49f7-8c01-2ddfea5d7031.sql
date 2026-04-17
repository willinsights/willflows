
-- Backfill orphan video_approvals using video_versions
UPDATE public.video_approvals va
SET project_id = vv.project_id
FROM public.video_versions vv
WHERE va.video_version_id = vv.id
  AND va.project_id IS NULL
  AND vv.project_id IS NOT NULL;

UPDATE public.video_approvals va
SET task_id = vv.task_id
FROM public.video_versions vv
WHERE va.video_version_id = vv.id
  AND va.task_id IS NULL
  AND vv.task_id IS NOT NULL;

-- Defense-in-depth trigger: auto-fill project_id and task_id from video_versions
CREATE OR REPLACE FUNCTION public.fill_video_approval_refs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.video_version_id IS NOT NULL AND (NEW.project_id IS NULL OR NEW.task_id IS NULL) THEN
    SELECT
      COALESCE(NEW.project_id, vv.project_id),
      COALESCE(NEW.task_id, vv.task_id)
    INTO NEW.project_id, NEW.task_id
    FROM public.video_versions vv
    WHERE vv.id = NEW.video_version_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_video_approval_refs ON public.video_approvals;
CREATE TRIGGER trg_fill_video_approval_refs
BEFORE INSERT ON public.video_approvals
FOR EACH ROW
EXECUTE FUNCTION public.fill_video_approval_refs();
