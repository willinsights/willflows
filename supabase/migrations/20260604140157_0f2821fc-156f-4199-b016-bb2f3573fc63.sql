
-- Fix video-versions upload policy (broken workspace check)
DROP POLICY IF EXISTS "Editors can upload videos" ON storage.objects;
CREATE POLICY "Editors can upload videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'video-versions'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.is_active = true
      AND (wm.workspace_id)::text = (storage.foldername(name))[1]
      AND wm.role IN ('admin'::public.app_role, 'edicao'::public.app_role)
  )
);

-- Restrict exports bucket INSERT to user's own workspace folder (or service role)
DROP POLICY IF EXISTS "Service can write exports" ON storage.objects;
CREATE POLICY "Service role can write exports"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'exports');

CREATE POLICY "Members can write exports to own workspace folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] IN (
    SELECT (wm.workspace_id)::text FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);

-- Fix automation_jobs SELECT policy: argument order was reversed
DROP POLICY IF EXISTS "Workspace members can view automation jobs" ON public.automation_jobs;
CREATE POLICY "Workspace members can view automation jobs"
ON public.automation_jobs FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Make video_approval_tokens admin-only SELECT explicit (defence-in-depth)
DROP POLICY IF EXISTS "Admins can manage approval tokens" ON public.video_approval_tokens;
CREATE POLICY "Admins can manage approval tokens"
ON public.video_approval_tokens FOR ALL TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
