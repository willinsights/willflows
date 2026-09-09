-- 1. OAuth token crypto: service-role / owner only
CREATE OR REPLACE FUNCTION public.encrypt_oauth_token(_token text, _user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  encryption_key bytea;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _token IS NULL THEN
    RETURN NULL;
  END IF;
  encryption_key := extensions.digest(_user_id::text || 'willflow_oauth_salt_v1', 'sha256');
  RETURN encode(
    extensions.encrypt(convert_to(_token, 'UTF8'), encryption_key, 'aes'),
    'base64'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_oauth_token(_encrypted_token text, _user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  encryption_key bytea;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  encryption_key := extensions.digest(_user_id::text || 'willflow_oauth_salt_v1', 'sha256');
  RETURN convert_from(
    extensions.decrypt(decode(_encrypted_token, 'base64'), encryption_key, 'aes'),
    'UTF8'
  );
EXCEPTION
  WHEN insufficient_privilege THEN RAISE;
  WHEN OTHERS THEN RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.encrypt_oauth_token(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_oauth_token(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_oauth_token(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_oauth_token(text, uuid) TO service_role;

-- 2. Subscription / metrics RPCs: caller must be the target user
CREATE OR REPLACE FUNCTION public.get_user_subscription_info(p_user_id uuid)
RETURNS TABLE(subscription_plan subscription_plan, subscription_status text, workspaces_limit integer, users_limit integer, projects_limit integer, trial_ends_at timestamp with time zone, current_period_end timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    COALESCE(us.subscription_plan, 'essencial'::subscription_plan),
    COALESCE(us.subscription_status, 'trialing'),
    CASE us.subscription_plan WHEN 'essencial' THEN 1 WHEN 'pro' THEN 3 WHEN 'studio' THEN 10 ELSE 1 END,
    CASE us.subscription_plan WHEN 'essencial' THEN 2 WHEN 'pro' THEN 10 WHEN 'studio' THEN 999 ELSE 2 END,
    CASE us.subscription_plan WHEN 'essencial' THEN 15 WHEN 'pro' THEN 100 WHEN 'studio' THEN 999 ELSE 15 END,
    us.trial_ends_at,
    us.current_period_end
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_admin_workspaces(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN COALESCE((
    SELECT COUNT(*)::int FROM public.workspace_members
    WHERE user_id = p_user_id AND role = 'admin' AND is_active = true
  ), 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_total_invited_users(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN COALESCE((
    SELECT COUNT(DISTINCT wm2.user_id)::int
    FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = p_user_id AND wm1.role = 'admin' AND wm1.is_active = true
      AND wm2.is_active = true AND wm2.user_id != p_user_id
  ), 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_total_projects(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN COALESCE((
    SELECT COUNT(*)::int
    FROM public.projects p
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE wm.user_id = p_user_id AND wm.role = 'admin' AND wm.is_active = true
      AND p.current_phase IN ('captacao', 'edicao')
  ), 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_user_subscription_info(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_admin_workspaces(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_total_invited_users(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_total_projects(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_info(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_admin_workspaces(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_total_invited_users(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_total_projects(uuid) TO authenticated, service_role;