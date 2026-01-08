-- Fix 1: Remove public access to workspace invitations and add secure validation
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.workspace_invitations;

-- Create a policy that only allows authenticated users to view invitations for their own email
CREATE POLICY "Users can view invitations for their email" 
ON public.workspace_invitations 
FOR SELECT 
USING (
  auth.email() IS NOT NULL AND LOWER(email) = LOWER(auth.email())
);

-- Fix 2: Restrict activity_log insert to admin/editor roles only
DROP POLICY IF EXISTS "System can insert activity log" ON public.activity_log;

CREATE POLICY "Admin and editor can insert activity log" 
ON public.activity_log 
FOR INSERT 
WITH CHECK (
  public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor')
);

-- Fix 3: Restrict client data access to admin, editor, and captacao roles only
DROP POLICY IF EXISTS "Members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members can view clients" ON public.clients;

CREATE POLICY "Admin, editor, captacao can view clients" 
ON public.clients 
FOR SELECT 
USING (
  public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor', 'captacao')
);