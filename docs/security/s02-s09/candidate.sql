-- CANDIDATE ONLY. Do not put in an automatic migration directory.
-- Apply only after a fresh catalog comparison and separate production authorization.
BEGIN;

-- S02: keep workspace configuration editable under the existing admin RLS.
-- Revoking column UPDATE as well prevents a historical column grant bypass.
REVOKE INSERT, UPDATE ON public.workspaces FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, name, slug, country, currency, timezone, locale, logo_url,
  subscription_plan, subscription_status, stripe_customer_id, stripe_subscription_id,
  trial_ends_at, created_at, updated_at, onboarding_completed,
  onboarding_business_type, onboarding_completed_at, vat_rate_default, vat_regime,
  vat_country) ON public.workspaces FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, slug, country, currency, timezone, locale, logo_url,
  updated_at, vat_rate_default, vat_regime, vat_country)
  ON public.workspaces TO authenticated;

-- Existing owner-executed, authenticated create/onboarding functions and Auth
-- trigger continue working. Service-role billing clients retain their privileges.
-- No role derived from workspace membership or user metadata is privileged here.
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
  IF auth.uid() IS NULL OR NOT public.is_system_admin(auth.uid()) THEN
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

-- S09: retain signature and counter semantics; only a verified service context
-- (or the already hardened S01 local maintenance context) may consume a code.
CREATE OR REPLACE FUNCTION public.increment_promo_code_usage(code_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Consumo de promoção reservado ao servidor' USING ERRCODE = '42501';
  END IF;
  UPDATE public.promo_codes SET used_count = used_count + 1 WHERE code = code_text;
END;
$function$;
REVOKE ALL ON FUNCTION public.increment_promo_code_usage(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_code_usage(text) TO service_role;

COMMIT;