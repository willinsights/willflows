-- Create RLS policy for DELETE on video_comments
-- Allows workspace members to delete any comment in their workspace

CREATE POLICY "Members can delete video comments"
  ON video_comments
  FOR DELETE
  TO authenticated
  USING (
    is_workspace_member(auth.uid(), workspace_id)
  );