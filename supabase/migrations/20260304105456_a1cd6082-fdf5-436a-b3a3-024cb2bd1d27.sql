
-- Fix views to use security invoker instead of security definer
ALTER VIEW public.v_project_profit SET (security_invoker = true);
ALTER VIEW public.v_collaborator_payments SET (security_invoker = true);
