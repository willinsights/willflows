DROP POLICY IF EXISTS "Anyone can track blog shares" ON public.blog_share_analytics;

DROP POLICY IF EXISTS "Members with edit permission can update tasks" ON public.tasks;
CREATE POLICY "Members with edit permission can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'::text)
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
  )
)
WITH CHECK (
  has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'::text)
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
  )
);