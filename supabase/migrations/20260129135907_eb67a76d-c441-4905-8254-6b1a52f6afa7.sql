-- Add project_id to video_approvals and video_approval_tokens
-- Allow task_id to be nullable (will be deprecated)

-- 1. Add project_id to video_approvals
ALTER TABLE public.video_approvals 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- 2. Add project_id to video_approval_tokens
ALTER TABLE public.video_approval_tokens 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- 3. Add project_id to video_comments (it references via video_version but having it directly is useful)
ALTER TABLE public.video_comments 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- 4. Make task_id nullable in all video tables (we'll migrate to project_id)
ALTER TABLE public.video_versions ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE public.video_approvals ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE public.video_approval_tokens ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE public.video_comments ALTER COLUMN task_id DROP NOT NULL;

-- 5. Backfill project_id from video_versions for existing approvals
UPDATE public.video_approvals a
SET project_id = v.project_id
FROM public.video_versions v
WHERE a.video_version_id = v.id AND a.project_id IS NULL;

-- 6. Backfill project_id for video_approval_tokens from video_versions
UPDATE public.video_approval_tokens t
SET project_id = (
  SELECT DISTINCT v.project_id 
  FROM public.video_versions v 
  WHERE v.task_id = t.task_id 
  LIMIT 1
)
WHERE t.project_id IS NULL AND t.task_id IS NOT NULL;

-- 7. Backfill project_id for video_comments
UPDATE public.video_comments c
SET project_id = v.project_id
FROM public.video_versions v
WHERE c.video_version_id = v.id AND c.project_id IS NULL;

-- 8. Create indexes for project_id queries
CREATE INDEX IF NOT EXISTS idx_video_versions_project_id ON public.video_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_video_approvals_project_id ON public.video_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_video_approval_tokens_project_id ON public.video_approval_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_project_id ON public.video_comments(project_id);

-- 9. Update RLS policies to support project-level access

-- Drop old policies for video_approvals if they exist
DROP POLICY IF EXISTS "Members can view video approvals" ON public.video_approvals;
DROP POLICY IF EXISTS "Members can insert video approvals" ON public.video_approvals;
DROP POLICY IF EXISTS "Service role can manage video approvals" ON public.video_approvals;

-- Create new policies using project-level workspace access
CREATE POLICY "Members can view video approvals" 
ON public.video_approvals FOR SELECT 
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert video approvals" 
ON public.video_approvals FOR INSERT 
WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Service role can manage video approvals" 
ON public.video_approvals FOR ALL 
USING (is_service_role());