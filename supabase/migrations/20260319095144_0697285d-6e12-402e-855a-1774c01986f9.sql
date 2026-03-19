DROP POLICY IF EXISTS "Workspace members can create followups" ON followups;

CREATE POLICY "Workspace members can create followups"
ON followups FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = created_by) AND
  (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = followups.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.is_active = true
  ))
);