-- CANDIDATE ONLY: phase 1 additive; privileges on workspaces/promo unchanged.
DO $preflight$ BEGIN
 IF to_regprocedure('public.admin_manage_workspace_billing(uuid,text,integer,text)') IS NOT NULL THEN
  RAISE EXCEPTION 'Unexpected existing billing RPC; stop and compare catalog';
 END IF;
END $preflight$;
DO $catalog$ BEGIN
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.complete_workspace_onboarding(uuid,text)')))) IS DISTINCT FROM '2f7d566e9b67d59e8d0163dca9d3da52' THEN RAISE EXCEPTION 'Definition drift: complete_workspace_onboarding(uuid,text)'; END IF;
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.create_trial_subscription()')))) IS DISTINCT FROM 'a6e54b3adad4b90484e6ca2b81539324' THEN RAISE EXCEPTION 'Definition drift: create_trial_subscription()'; END IF;
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.create_workspace_with_admin(text,text,country_region,text,text,text)')))) IS DISTINCT FROM 'b328b8658a7a64c80f846c58b78a6826' THEN RAISE EXCEPTION 'Definition drift: create_workspace_with_admin(text,text,country_region,text,text,text)'; END IF;
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.is_service_role()')))) IS DISTINCT FROM '20dc0d9cbd7e754e864759ce38cf64c1' THEN RAISE EXCEPTION 'Definition drift: is_service_role()'; END IF;
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.is_system_admin()')))) IS DISTINCT FROM '20496c6b86f31a348e4b6fb4295a7be3' THEN RAISE EXCEPTION 'Definition drift: is_system_admin()'; END IF;
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.is_system_admin(uuid)')))) IS DISTINCT FROM '73826fbea962fdf47e1d15124b14783c' THEN RAISE EXCEPTION 'Definition drift: is_system_admin(uuid)'; END IF;
END $catalog$;
CREATE OR REPLACE FUNCTION public.admin_manage_workspace_billing(
  p_workspace_id uuid, p_action text, p_days integer DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_workspace public.workspaces%ROWTYPE;
  v_trial_end timestamptz;
BEGIN
  IF auth.uid() IS NULL OR public.is_system_admin(auth.uid()) IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso administrativo necessário' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('extend_trial', 'convert_trial', 'block', 'unblock') THEN
    RAISE EXCEPTION 'Operação administrativa inválida' USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('extend_trial', 'convert_trial') AND
     (p_reason IS NULL OR length(btrim(p_reason)) = 0) THEN
    RAISE EXCEPTION 'Informe o motivo' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'extend_trial' AND (p_days IS NULL OR p_days <= 0) THEN
    RAISE EXCEPTION 'Informe um número positivo de dias' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_workspace FROM public.workspaces
    WHERE id = p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace não encontrado' USING ERRCODE = 'P0002';
  END IF;
  v_trial_end := v_workspace.trial_ends_at;
  IF p_action = 'extend_trial' THEN
    v_trial_end := greatest(coalesce(v_trial_end, now()), now()) + make_interval(days => p_days);
    UPDATE public.workspaces SET trial_ends_at = v_trial_end,
      subscription_status = 'trialing', updated_at = now() WHERE id = p_workspace_id;
  ELSIF p_action = 'convert_trial' THEN
    v_trial_end := NULL;
    UPDATE public.workspaces SET subscription_status = 'active',
      trial_ends_at = NULL, updated_at = now() WHERE id = p_workspace_id;
  ELSE
    UPDATE public.workspaces SET subscription_status = CASE WHEN p_action = 'block'
      THEN 'canceled' ELSE 'active' END, updated_at = now() WHERE id = p_workspace_id;
  END IF;
  INSERT INTO public.admin_audit_log
    (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), CASE p_action WHEN 'block' THEN 'block_workspace'
    WHEN 'unblock' THEN 'unblock_workspace' ELSE p_action END,
    'workspace', p_workspace_id, jsonb_build_object('reason', p_reason,
      'days_added', CASE WHEN p_action = 'extend_trial' THEN p_days ELSE NULL END,
      'previous_status', v_workspace.subscription_status,
      'previous_trial_ends_at', v_workspace.trial_ends_at,
      'new_end_date', v_trial_end));
  RETURN jsonb_build_object('workspace_id', p_workspace_id, 'trial_ends_at', v_trial_end);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_manage_workspace_billing(uuid,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_workspace_billing(uuid,text,integer,text) TO authenticated, service_role;

