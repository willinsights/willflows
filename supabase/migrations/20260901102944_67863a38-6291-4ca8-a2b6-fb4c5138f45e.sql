REVOKE ALL ON FUNCTION public.enforce_workspace_subscription_active() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_plan_project_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_plan_client_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_plan_resource_limit(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.workspace_is_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workspace_is_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_resource_limit(text, text) TO authenticated;