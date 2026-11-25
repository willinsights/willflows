CREATE OR REPLACE FUNCTION public.can_access_feature(p_workspace_id uuid, p_feature text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_plan TEXT; v_status TEXT; v_trial_end timestamptz; v_feature_available BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = p_workspace_id AND user_id = auth.uid() AND is_active = true) THEN
    RETURN FALSE;
  END IF;
  SELECT COALESCE(subscription_plan::text, 'starter'), subscription_status, trial_ends_at
    INTO v_plan, v_status, v_trial_end FROM workspaces WHERE id = p_workspace_id;
  IF v_status = 'trialing' AND v_trial_end > now() THEN
    v_plan := 'studio';
  ELSIF v_status IS NULL OR v_status NOT IN ('active') THEN
    v_plan := 'starter';
  END IF;
  CASE p_feature
    WHEN 'chat','exportExcel','exportPdf','googleCalendar','googleMeet','reportsAdvanced','templates','crmComplete'
      THEN v_feature_available := v_plan IN ('pro','studio');
    WHEN 'videoApproval','frameio','automations','api','permissions'
      THEN v_feature_available := v_plan = 'studio';
    WHEN 'kanban','crmBasic','calendar','mediaHub','reportsBasic','financialReports'
      THEN v_feature_available := TRUE;
    ELSE v_feature_available := FALSE;
  END CASE;
  RETURN v_feature_available;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_contract_signature()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'signed' OR NEW.signed_at IS NOT NULL OR NEW.client_signature_data IS NOT NULL OR NEW.client_signed_name IS NOT NULL THEN
        RAISE EXCEPTION 'Contratos só podem ser assinados pelo cliente' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF (NEW.status = 'signed' AND OLD.status IS DISTINCT FROM 'signed')
         OR (OLD.status = 'signed' AND NEW.status IS DISTINCT FROM 'signed')
         OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
         OR NEW.client_signature_data IS DISTINCT FROM OLD.client_signature_data
         OR NEW.client_signed_name IS DISTINCT FROM OLD.client_signed_name
         OR NEW.client_signed_ip IS DISTINCT FROM OLD.client_signed_ip
         OR NEW.client_signed_user_agent IS DISTINCT FROM OLD.client_signed_user_agent
         OR (OLD.status = 'signed' AND (
              NEW.total_value IS DISTINCT FROM OLD.total_value
           OR NEW.content IS DISTINCT FROM OLD.content
           OR NEW.payment_terms IS DISTINCT FROM OLD.payment_terms
           OR NEW.client_id IS DISTINCT FROM OLD.client_id
           OR NEW.project_id IS DISTINCT FROM OLD.project_id
           OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id)) THEN
        RAISE EXCEPTION 'Contratos só podem ser assinados pelo cliente' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;