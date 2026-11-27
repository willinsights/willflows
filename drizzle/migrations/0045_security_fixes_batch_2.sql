DROP POLICY IF EXISTS "Members with edit permission can update tasks" ON public.tasks;
CREATE POLICY "Members with edit permission can update tasks" ON public.tasks FOR UPDATE TO authenticated
USING (public.has_workspace_permission(auth.uid(), workspace_id, 'projects.edit') OR (
  EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.is_active = true)))
WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'projects.edit') OR (
  EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.is_active = true)));

DROP POLICY IF EXISTS "Assignees and editors can manage checklists" ON public.task_checklists;
CREATE POLICY "Assignees and editors can manage checklists" ON public.task_checklists FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_checklists.task_id AND (
  public.has_workspace_permission(auth.uid(), t.workspace_id, 'projects.edit') OR (
  EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = t.workspace_id AND wm.user_id = auth.uid() AND wm.is_active = true)))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_checklists.task_id AND (
  public.has_workspace_permission(auth.uid(), t.workspace_id, 'projects.edit') OR (
  EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = t.workspace_id AND wm.user_id = auth.uid() AND wm.is_active = true)))));

CREATE OR REPLACE FUNCTION public.guard_project_team_self_pay()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RETURN NEW; END IF;
  IF public.is_workspace_admin(auth.uid(), COALESCE(NEW.workspace_id, (SELECT workspace_id FROM public.projects WHERE id = NEW.project_id))) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.payment_amount IS NOT DISTINCT FROM OLD.payment_amount
     AND NEW.cost_amount IS NOT DISTINCT FROM OLD.cost_amount
     AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status
     AND NEW.paid_at IS NOT DISTINCT FROM OLD.paid_at THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.payment_amount IS NULL AND NEW.cost_amount IS NULL
     AND COALESCE(NEW.payment_status::text, 'pendente') = 'pendente' AND NEW.paid_at IS NULL THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Not allowed to set your own pay' USING ERRCODE = '42501';
END $function$;

CREATE OR REPLACE FUNCTION public.sign_contract_public(_token text, _signer_name text, _signature_data text, _ip_address text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_contract_id UUID;
  v_contract_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_clean_name TEXT;
BEGIN
  IF _token IS NULL OR trim(_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_required');
  END IF;
  v_clean_name := trim(_signer_name);
  IF v_clean_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'signer_name_required');
  END IF;
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'name_length_invalid');
  END IF;
  IF v_clean_name !~ '^[A-Za-zÀ-ÿ0-9 .,''''-]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_characters');
  END IF;
  IF _signature_data IS NULL OR trim(_signature_data) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'signature_required');
  END IF;
  IF char_length(_signature_data) > 500000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'signature_too_large');
  END IF;

  SELECT id, status, expires_at INTO v_contract_id, v_contract_status, v_expires_at
  FROM contracts WHERE signature_token = _token
  FOR UPDATE;

  IF v_contract_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;
  IF v_contract_status NOT IN ('sent', 'viewed') OR v_contract_status = 'viewed' AND false THEN
    NULL;
  END IF;
  IF v_contract_status <> 'sent' THEN
    IF v_contract_status = 'signed' THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_signed');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'contract_not_signable');
    END IF;
  END IF;
  IF v_expires_at IS NOT NULL AND v_expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'contract_expired');
  END IF;

  UPDATE contracts SET
    status = 'signed',
    signed_at = now(),
    client_signed_name = v_clean_name,
    client_signature_data = _signature_data,
    client_signed_ip = left(_ip_address, 45),
    client_signed_user_agent = left(_user_agent, 500)
  WHERE id = v_contract_id;

  RETURN jsonb_build_object('success', true, 'contract_id', v_contract_id, 'signed_at', now());
END;
$function$;