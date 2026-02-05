-- Fix INSERT policy to use clients.create instead of clients.edit
DROP POLICY IF EXISTS "Members with edit permission can create clients" ON public.clients;

CREATE POLICY "Members with create permission can create clients"
ON public.clients FOR INSERT
WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'clients.create'));