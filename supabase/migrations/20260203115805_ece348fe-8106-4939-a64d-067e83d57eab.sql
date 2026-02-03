-- 1. Criar função helper can_edit_project
CREATE OR REPLACE FUNCTION public.can_edit_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = _project_id
      AND has_workspace_permission(_user_id, p.workspace_id, 'projects.edit')
  )
$$;

-- 2. Actualizar project_media_links
DROP POLICY IF EXISTS "Members with editing rights can manage project media links" 
  ON project_media_links;

CREATE POLICY "Members with edit permission can manage project media links"
  ON project_media_links FOR ALL TO authenticated
  USING (can_edit_project(auth.uid(), project_id))
  WITH CHECK (can_edit_project(auth.uid(), project_id));

-- 3. Actualizar project_team
DROP POLICY IF EXISTS "Members with editing rights can manage project team" 
  ON project_team;

CREATE POLICY "Members with edit permission can manage project team"
  ON project_team FOR ALL TO authenticated
  USING (can_edit_project(auth.uid(), project_id))
  WITH CHECK (can_edit_project(auth.uid(), project_id));

-- 4. Actualizar tasks - INSERT
DROP POLICY IF EXISTS "Members with editing rights can create tasks" ON tasks;

CREATE POLICY "Members with edit permission can create tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
    OR (
      project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = project_id 
        AND has_workspace_permission(auth.uid(), p.workspace_id, 'projects.edit')
      )
    )
  );

-- 4b. Actualizar tasks - UPDATE
DROP POLICY IF EXISTS "Members with editing rights can update tasks" ON tasks;

CREATE POLICY "Members with edit permission can update tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
    OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = id AND ta.user_id = auth.uid())
  );

-- 4c. Actualizar tasks - DELETE
DROP POLICY IF EXISTS "Members with editing rights can delete tasks" ON tasks;

CREATE POLICY "Members with edit permission can delete tasks"
  ON tasks FOR DELETE TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
  );

-- 5. Actualizar task_assignees
DROP POLICY IF EXISTS "Members with editing rights can manage task assignees" 
  ON task_assignees;

CREATE POLICY "Members with edit permission can manage task assignees"
  ON task_assignees FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_workspace_permission(auth.uid(), t.workspace_id, 'projects.edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_workspace_permission(auth.uid(), t.workspace_id, 'projects.edit')
    )
  );

-- 6. Actualizar task_checklists
DROP POLICY IF EXISTS "Assignees and editors can manage checklists" 
  ON task_checklists;

CREATE POLICY "Assignees and editors can manage checklists"
  ON task_checklists FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND (
        has_workspace_permission(auth.uid(), t.workspace_id, 'projects.edit')
        OR EXISTS (
          SELECT 1 FROM task_assignees ta 
          WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND (
        has_workspace_permission(auth.uid(), t.workspace_id, 'projects.edit')
        OR EXISTS (
          SELECT 1 FROM task_assignees ta 
          WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
        )
      )
    )
  );

-- 7. Actualizar calendar_events - INSERT
DROP POLICY IF EXISTS "Members with editing rights can create events" 
  ON calendar_events;

CREATE POLICY "Members with edit permission can create events"
  ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
  );

-- 7b. Actualizar calendar_events - UPDATE
DROP POLICY IF EXISTS "Members with editing rights can update events" 
  ON calendar_events;

CREATE POLICY "Members with edit permission can update events"
  ON calendar_events FOR UPDATE TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
  );

-- 7c. Actualizar calendar_events - DELETE
DROP POLICY IF EXISTS "Members with editing rights can delete events" 
  ON calendar_events;

CREATE POLICY "Members with edit permission can delete events"
  ON calendar_events FOR DELETE TO authenticated
  USING (
    has_workspace_permission(auth.uid(), workspace_id, 'projects.edit')
  );