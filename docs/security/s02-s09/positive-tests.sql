-- Synthetic-only integration fixture. Run only on an empty LOCAL database.
-- This file must never be executed against the project database.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
  $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS
  $$ SELECT nullif(current_setting('test.role', true), '') $$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, service_role;
CREATE TYPE public.country_region AS ENUM ('PT','BR');
CREATE TYPE public.subscription_plan AS ENUM ('starter','essencial','pro','studio');
CREATE TYPE public.app_role AS ENUM ('admin','edicao','captacao','gestao','visualizacao');
CREATE TABLE public.system_admins (user_id uuid);
CREATE TABLE public.workspace_members (
  workspace_id uuid, user_id uuid, role app_role, is_active boolean, joined_at timestamptz);
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, slug text,
  country country_region, currency text, timezone text, locale text, logo_url text,
  subscription_plan subscription_plan DEFAULT 'starter',
  subscription_status text DEFAULT 'trialing', stripe_customer_id text,
  stripe_subscription_id text, trial_ends_at timestamptz DEFAULT now() + interval '7 days',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  onboarding_completed boolean DEFAULT false, onboarding_business_type text,
  onboarding_completed_at timestamptz, vat_rate_default numeric DEFAULT 23,
  vat_regime text DEFAULT 'standard', vat_country text DEFAULT 'PT');
CREATE TABLE public.user_subscriptions (
  user_id uuid, subscription_plan subscription_plan, subscription_status text, trial_ends_at timestamptz);
CREATE TABLE public.synthetic_signup (id uuid);
CREATE TABLE public.promo_codes (code text, used_count integer DEFAULT 0);
CREATE TABLE public.admin_audit_log (
  admin_user_id uuid, action text, target_type text, target_id uuid, details jsonb);
GRANT ALL ON public.workspaces TO anon, authenticated, service_role;
GRANT ALL ON public.workspace_members, public.user_subscriptions, public.promo_codes TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY synthetic_read ON public.workspaces FOR SELECT TO authenticated USING (true);
CREATE POLICY synthetic_admin_update ON public.workspaces FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id=id
    AND m.user_id=auth.uid() AND m.role='admin' AND m.is_active));
GRANT SELECT ON public.workspace_members TO authenticated;
CREATE FUNCTION public.initialize_workspace_permissions(uuid) RETURNS void LANGUAGE sql AS $$ SELECT $$;
CREATE FUNCTION public.assert_positive(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Positive test failed: %', message; END IF; END $$;
-- Exact captured function definitions are loaded by run-positive-tests.py.