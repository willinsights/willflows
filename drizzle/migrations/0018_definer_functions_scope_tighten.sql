-- Promo codes: no client caller; stop exposing coupon details to browsers.
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO service_role;

-- Subscription info: no client caller; server only.
REVOKE EXECUTE ON FUNCTION public.get_user_subscription_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_info(uuid) TO service_role;

-- Invitation lookup: full email only for the signed-in invitee; others see the masked email.
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(id uuid, workspace_id uuid, workspace_name text, email text, email_masked text, role app_role, expires_at timestamptz, accepted_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wi.id,
    wi.workspace_id,
    w.name AS workspace_name,
    CASE WHEN auth.uid() IS NOT NULL AND wi.email_hash = public.hash_email(
      (SELECT u.email FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL)
    ) THEN wi.email ELSE NULL END AS email,
    wi.email_masked,
    wi.role,
    wi.expires_at,
    wi.accepted_at
  FROM public.workspace_invitations wi
  JOIN public.workspaces w ON w.id = wi.workspace_id
  WHERE wi.token_hash = public.hash_invitation_token(_token)
    AND wi.accepted_at IS NULL
    AND wi.expires_at > now();
$$;

-- Projects summary: correct argument order of the membership check.
CREATE OR REPLACE FUNCTION public.get_workspace_projects_summary(p_workspace_id uuid)
RETURNS TABLE(total_projects bigint, projects_by_status jsonb, projects_with_overdue_invoices bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH allowed AS (
    SELECT (auth.uid() IS NOT NULL AND public.is_workspace_member(auth.uid(), p_workspace_id)) OR public.is_system_admin() AS ok
  ),
  proj AS (
    SELECT p.id, p.current_phase, p.is_delivered
    FROM public.projects p, allowed a
    WHERE a.ok AND p.workspace_id = p_workspace_id
  ),
  by_phase AS (
    SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) AS j
    FROM (SELECT current_phase::text AS k, COUNT(*)::bigint AS v FROM proj GROUP BY current_phase) t
  ),
  delivered_count AS (
    SELECT COUNT(*) FILTER (WHERE is_delivered)::bigint AS c FROM proj
  ),
  overdue AS (
    SELECT COUNT(DISTINCT i.project_id)::bigint AS c
    FROM public.invoices i, allowed a
    WHERE a.ok AND i.workspace_id = p_workspace_id AND i.status = 'vencida'
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM proj),
    (SELECT j FROM by_phase) || jsonb_build_object('delivered', (SELECT c FROM delivered_count)),
    (SELECT c FROM overdue);
$$;
REVOKE EXECUTE ON FUNCTION public.get_workspace_projects_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_projects_summary(uuid) TO authenticated, service_role;