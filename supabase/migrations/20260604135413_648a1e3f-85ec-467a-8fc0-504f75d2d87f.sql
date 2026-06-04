
-- 1) Contracts: restrict SELECT to permission holders
DROP POLICY IF EXISTS "Members can view contracts" ON public.contracts;

CREATE POLICY "Members with contract permission can view contracts"
ON public.contracts
FOR SELECT
TO authenticated
USING (
  public.has_workspace_permission(auth.uid(), workspace_id, 'visibility.contracts')
);

-- 2) Chat attachments storage: tighten INSERT policy
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;

CREATE POLICY "Workspace members can upload chat attachments to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);
