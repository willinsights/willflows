-- Positive flows only, one synthetic user/workspace; no foreign-account probes.
SELECT set_config('test.uid','11111111-1111-1111-1111-111111111111',false);
SELECT set_config('test.role','authenticated',false);
INSERT INTO public.synthetic_signup VALUES (auth.uid());
SELECT public.assert_positive((SELECT trial_ends_at = now() + interval '7 days'
  FROM public.user_subscriptions LIMIT 1), 'signup receives exactly seven days');
SET ROLE authenticated;
SELECT public.create_workspace_with_admin('Synthetic studio','synthetic-studio') AS workspace_id \gset
UPDATE public.workspaces SET name='Renamed synthetic', currency='BRL', country='BR',
  timezone='America/Sao_Paulo', vat_rate_default=0, updated_at=now() WHERE id=:'workspace_id';
SELECT public.complete_workspace_onboarding(:'workspace_id','studio');
SELECT public.assert_positive((SELECT name='Renamed synthetic' AND currency='BRL'
  AND onboarding_completed FROM public.workspaces WHERE id=:'workspace_id'), 'name/config/onboarding preserved');
SELECT public.assert_positive((SELECT subscription_plan='essencial' AND subscription_status='trialing'
  AND trial_ends_at=now()+interval '7 days' FROM public.workspaces WHERE id=:'workspace_id'), 'server-created workspace trial');
RESET ROLE;
INSERT INTO public.system_admins VALUES (auth.uid());
SET ROLE authenticated;
SELECT public.admin_manage_workspace_billing(:'workspace_id','extend_trial',3,'synthetic approval');
SELECT public.assert_positive((SELECT trial_ends_at=now()+interval '10 days'
  FROM public.workspaces WHERE id=:'workspace_id'), 'legitimate extension is calculated on server');
SELECT public.admin_manage_workspace_billing(:'workspace_id','convert_trial',null,'synthetic approval');
SELECT public.admin_manage_workspace_billing(:'workspace_id','block');
SELECT public.admin_manage_workspace_billing(:'workspace_id','unblock');
RESET ROLE;
SELECT public.assert_positive((SELECT count(*)=4 FROM public.admin_audit_log), 'atomic administrative audit');
SELECT set_config('test.role','service_role',false);
SET ROLE service_role;
UPDATE public.workspaces SET subscription_plan='pro', subscription_status='active',
  stripe_customer_id='synthetic-customer', stripe_subscription_id='synthetic-subscription'
  WHERE id=:'workspace_id';
INSERT INTO public.promo_codes VALUES ('SYNTHETIC',0);
SELECT public.increment_promo_code_usage('SYNTHETIC');
RESET ROLE;
SELECT public.assert_positive((SELECT used_count=1 FROM public.promo_codes), 'authorized service consumes once');
SELECT public.assert_positive((SELECT subscription_plan='pro' AND subscription_status='active'
  FROM public.workspaces WHERE id=:'workspace_id'), 'service billing updates preserved');
-- Static catalog checks, not attempts to exploit denied operations.
SELECT public.assert_positive(NOT has_column_privilege('authenticated','public.workspaces','trial_ends_at','UPDATE'), 'trial protected');
SELECT public.assert_positive(NOT has_column_privilege('authenticated','public.workspaces','subscription_plan','UPDATE'), 'plan protected');
SELECT public.assert_positive(has_column_privilege('authenticated','public.workspaces','name','UPDATE'), 'name editable');
SELECT public.assert_positive(NOT has_function_privilege('authenticated','public.increment_promo_code_usage(text)','EXECUTE'), 'promo restricted');
SELECT public.assert_positive(has_function_privilege('service_role','public.increment_promo_code_usage(text)','EXECUTE'), 'promo service access preserved');
SELECT public.assert_positive(NOT has_column_privilege('authenticated','public.workspaces','subscription_status','UPDATE'), 'subscription status protected');
SELECT public.assert_positive(NOT has_column_privilege('authenticated','public.workspaces','stripe_customer_id','UPDATE'), 'customer binding protected');
SELECT public.assert_positive(NOT has_column_privilege('authenticated','public.workspaces','stripe_subscription_id','UPDATE'), 'subscription binding protected');
SELECT public.assert_positive(NOT has_function_privilege('anon','public.increment_promo_code_usage(text)','EXECUTE'), 'anonymous promo execution absent');