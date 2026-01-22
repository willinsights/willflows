-- Permitir que system admins vejam TODOS os workspace_members
CREATE POLICY "System admins can view all workspace members"
ON public.workspace_members
FOR SELECT
USING (is_system_admin());

-- Permitir que system admins vejam TODOS os workspaces
CREATE POLICY "System admins can view all workspaces"
ON public.workspaces
FOR SELECT
USING (is_system_admin());

-- Permitir que system admins vejam TODOS os projects
CREATE POLICY "System admins can view all projects"
ON public.projects
FOR SELECT
USING (is_system_admin());

-- Permitir que system admins vejam TODOS os user_subscriptions
CREATE POLICY "System admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (is_system_admin());