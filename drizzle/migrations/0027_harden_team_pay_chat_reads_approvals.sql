CREATE OR REPLACE FUNCTION public.guard_project_team_self_pay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.payment_amount IS NOT DISTINCT FROM OLD.payment_amount
     AND NEW.cost_amount IS NOT DISTINCT FROM OLD.cost_amount THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.payment_amount IS NULL AND NEW.cost_amount IS NULL THEN RETURN NEW; END IF;
  SELECT workspace_id INTO v_ws FROM public.projects WHERE id = NEW.project_id;
  IF public.has_workspace_permission(auth.uid(), v_ws, 'payments.manage') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Not allowed to set your own pay' USING ERRCODE = '42501';
END $$;
DROP TRIGGER IF EXISTS guard_project_team_self_pay ON public.project_team;
CREATE TRIGGER guard_project_team_self_pay BEFORE INSERT OR UPDATE ON public.project_team
FOR EACH ROW EXECUTE FUNCTION public.guard_project_team_self_pay();

DROP POLICY IF EXISTS "Members can view conversation messages" ON public.messages;
CREATE POLICY "Members can view conversation messages" ON public.messages FOR SELECT TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()) AND EXISTS (
  SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND public.can_access_feature(c.workspace_id, 'chat')));

DROP POLICY IF EXISTS "Members can insert video approvals" ON public.video_approvals;
CREATE POLICY "Members can insert video approvals" ON public.video_approvals FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND approved_by_client = false AND approved_by_user_id = auth.uid());