CREATE OR REPLACE FUNCTION public.get_contract_by_token(_token text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_contract RECORD;
BEGIN
  IF _token IS NULL OR trim(_token) = '' THEN
    RETURN jsonb_build_object('found', false, 'error', 'invalid_token');
  END IF;
  SELECT c.id, c.workspace_id, c.client_id, c.project_id, c.title, c.content, c.status, c.sent_at, c.viewed_at,
    c.signed_at, c.expires_at, c.signature_token, c.client_signature_data, c.client_signed_name, c.total_value,
    c.payment_terms, c.created_at, c.updated_at, cl.id as client_id_ref, cl.name as client_name,
    cl.company as client_company, cl.email as client_email
  INTO v_contract
  FROM public.contracts c LEFT JOIN public.clients cl ON cl.id = c.client_id
  WHERE c.signature_token = _token AND c.status <> 'cancelled';
  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object('found', true,
    'contract', jsonb_build_object('id', v_contract.id, 'workspace_id', v_contract.workspace_id, 'client_id', v_contract.client_id,
      'project_id', v_contract.project_id, 'title', v_contract.title, 'content', v_contract.content, 'status', v_contract.status,
      'sent_at', v_contract.sent_at, 'viewed_at', v_contract.viewed_at, 'signed_at', v_contract.signed_at,
      'expires_at', v_contract.expires_at, 'signature_token', v_contract.signature_token,
      'client_signature_data', v_contract.client_signature_data, 'client_signed_name', v_contract.client_signed_name,
      'total_value', v_contract.total_value, 'payment_terms', v_contract.payment_terms,
      'created_at', v_contract.created_at, 'updated_at', v_contract.updated_at),
    'client', jsonb_build_object('id', v_contract.client_id_ref, 'name', v_contract.client_name,
      'company', v_contract.client_company, 'email', v_contract.client_email));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_contract_sign_token(_contract_id uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_c RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT workspace_id, signature_token, status, expires_at, created_by INTO v_c
  FROM public.contracts WHERE id = _contract_id;
  IF v_c.workspace_id IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF NOT public.has_workspace_permission(auth.uid(), v_c.workspace_id, 'visibility.contracts') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_c.created_by IS DISTINCT FROM auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = v_c.workspace_id
      AND wm.user_id = auth.uid() AND wm.is_active AND wm.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_c.status NOT IN ('draft','sent','viewed') OR (v_c.expires_at IS NOT NULL AND v_c.expires_at < now()) THEN
    RAISE EXCEPTION 'Contract is not open for signing';
  END IF;
  RETURN v_c.signature_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_project_agreed_value()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NEW.agreed_value IS DISTINCT FROM OLD.agreed_value
     AND auth.uid() IS NOT NULL
     AND NOT public.has_workspace_permission(auth.uid(), NEW.workspace_id, 'payments.manage') THEN
    RAISE EXCEPTION 'Changing the project price requires payment management permission';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_project_agreed_value ON public.projects;
CREATE TRIGGER guard_project_agreed_value BEFORE UPDATE OF agreed_value ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_project_agreed_value();