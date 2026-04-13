-- Fix 1: Remove overly permissive SELECT policy on video_approval_tokens
-- Only admins should see raw tokens (covered by existing "Admins can manage approval tokens" ALL policy)
DROP POLICY IF EXISTS "Members can view approval tokens" ON public.video_approval_tokens;

-- Fix 2: Fix the broken video upload storage policy
-- The old policy compared (w.id)::text = (storage.foldername(w.name))[1] which is wrong
-- It should compare workspace ID against the object path: (storage.foldername(name))[1]
DROP POLICY IF EXISTS "Editors can upload videos" ON storage.objects;

CREATE POLICY "Editors can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'video-versions'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM workspaces w
    WHERE (w.id)::text = (storage.foldername(name))[1]
    AND get_workspace_role(auth.uid(), w.id) IN ('admin', 'edicao')
  )
);