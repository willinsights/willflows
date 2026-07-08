DROP POLICY IF EXISTS "Feedback screenshots viewable by owner and admins" ON storage.objects;

CREATE POLICY "Feedback screenshots viewable by owner and admins"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'feedback-screenshots'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.feedback f
      JOIN public.workspace_members wm
        ON wm.workspace_id = f.workspace_id
      WHERE (f.user_id)::text = (storage.foldername(name))[1]
        AND wm.user_id = auth.uid()
        AND wm.role = 'admin'::app_role
        AND wm.is_active = true
    )
  )
);