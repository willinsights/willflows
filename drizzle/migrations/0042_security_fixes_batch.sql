DROP POLICY IF EXISTS "Users can insert conversation members" ON public.conversation_members;
CREATE POLICY "Users can insert conversation members" ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (
  (public.can_manage_conversation_members(conversation_id, auth.uid())
    AND (COALESCE(role,'member') <> 'admin' OR user_id <> auth.uid()
      OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
        AND (c.created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), c.workspace_id)))))
  OR ((user_id = auth.uid()) AND (COALESCE(role,'member') = 'member') AND public.is_public_channel_in_user_workspace(conversation_id, auth.uid()))
  OR ((user_id = auth.uid()) AND (COALESCE(role,'member') = 'member') AND public.is_project_chat_in_user_workspace(conversation_id, auth.uid()))
);
DROP POLICY IF EXISTS "Users can update conversation membership" ON public.conversation_members;
CREATE POLICY "Users can update conversation membership" ON public.conversation_members FOR UPDATE TO authenticated
USING ((user_id = auth.uid()) OR public.can_manage_conversation_members(conversation_id, auth.uid()))
WITH CHECK (
  ((user_id = auth.uid()) OR public.can_manage_conversation_members(conversation_id, auth.uid()))
  AND (COALESCE(role,'member') <> 'admin' OR user_id <> auth.uid()
    OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
      AND (c.created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), c.workspace_id))))
);

DROP POLICY IF EXISTS "Own row or financial access can view project team" ON public.project_team;
CREATE POLICY "Own row or financial access can view project team" ON public.project_team FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team.project_id AND (
  (project_team.user_id = auth.uid() AND public.is_workspace_member(auth.uid(), p.workspace_id))
  OR public.has_workspace_permission(auth.uid(), p.workspace_id, 'payments.view')
  OR public.can_edit_project(auth.uid(), p.id))));

DROP POLICY IF EXISTS "Members with project edit permission can manage video structure" ON public.video_structure_templates;
DROP POLICY IF EXISTS "Creator or admin can delete templates" ON public.video_structure_templates;
CREATE POLICY "Editors can create video structure templates" ON public.video_structure_templates FOR INSERT TO authenticated
WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'));
CREATE POLICY "Editors can update video structure templates" ON public.video_structure_templates FOR UPDATE TO authenticated
USING (public.has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'))
WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'));
CREATE POLICY "Admins can delete video structure templates" ON public.video_structure_templates FOR DELETE TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can view contract templates" ON public.contract_templates;

DROP POLICY IF EXISTS "Members with view permission can view clients" ON public.clients;
CREATE POLICY "Members with view permission can view clients" ON public.clients FOR SELECT TO authenticated
USING (public.has_workspace_permission(auth.uid(), workspace_id, 'clients.view')
  AND (lead_status IS NULL OR lead_status = 'ganho'
    OR public.has_workspace_permission(auth.uid(), workspace_id, 'visibility.leads')));

CREATE OR REPLACE FUNCTION public.guard_contract_member_sign()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'signed' AND OLD.status IS DISTINCT FROM 'signed'
     AND auth.uid() IS NOT NULL
     AND public.is_workspace_member(auth.uid(), NEW.workspace_id) THEN
    RAISE EXCEPTION 'Workspace members cannot sign contracts on behalf of the client';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_contract_member_sign ON public.contracts;
CREATE TRIGGER guard_contract_member_sign BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.guard_contract_member_sign();