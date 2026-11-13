-- CANDIDATE ONLY: execute only after phase 2 acceptance and old-tab refresh.
DO $catalog$ BEGIN
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.increment_promo_code_usage(text)')))) IS DISTINCT FROM 'e520dcf5507dbdba1ede6e64ae6bb3e5' THEN RAISE EXCEPTION 'Definition drift: increment_promo_code_usage(text)'; END IF;
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.is_service_role()')))) IS DISTINCT FROM '20dc0d9cbd7e754e864759ce38cf64c1' THEN RAISE EXCEPTION 'Definition drift: is_service_role()'; END IF;
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.is_system_admin()')))) IS DISTINCT FROM '20496c6b86f31a348e4b6fb4295a7be3' THEN RAISE EXCEPTION 'Definition drift: is_system_admin()'; END IF;
 IF (SELECT md5(pg_get_functiondef(to_regprocedure('public.is_system_admin(uuid)')))) IS DISTINCT FROM '73826fbea962fdf47e1d15124b14783c' THEN RAISE EXCEPTION 'Definition drift: is_system_admin(uuid)'; END IF;
END $catalog$;
REVOKE INSERT, UPDATE ON public.workspaces FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, name, slug, country, currency, timezone, locale, logo_url, subscription_plan, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at, updated_at, onboarding_completed, onboarding_business_type, onboarding_completed_at, vat_rate_default, vat_regime, vat_country) ON public.workspaces FROM PUBLIC, anon, authenticated;
GRANT UPDATE (id, name, slug, country, currency, timezone, locale, logo_url, created_at, updated_at, onboarding_completed, onboarding_business_type, onboarding_completed_at, vat_rate_default, vat_regime, vat_country) ON public.workspaces TO authenticated;
CREATE OR REPLACE FUNCTION public.increment_promo_code_usage(code_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF public.is_service_role() IS NOT TRUE THEN
    RAISE EXCEPTION 'Consumo de promoção reservado ao servidor' USING ERRCODE = '42501';
  END IF;
  UPDATE public.promo_codes SET used_count = used_count + 1 WHERE code = code_text;
END;
$function$;
REVOKE ALL ON FUNCTION public.increment_promo_code_usage(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_code_usage(text) TO service_role;

DO $effective$ DECLARE r text; col text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_table_privilege(r,'public.workspaces','INSERT') IS NOT FALSE THEN RAISE EXCEPTION 'Inherited INSERT remains'; END IF;
  FOREACH col IN ARRAY ARRAY['stripe_customer_id','stripe_subscription_id','subscription_plan','subscription_status','trial_ends_at'] LOOP
   IF has_column_privilege(r,'public.workspaces',col,'UPDATE') IS NOT FALSE THEN RAISE EXCEPTION 'Inherited billing UPDATE remains'; END IF;
  END LOOP;
  IF has_function_privilege(r,'public.increment_promo_code_usage(text)','EXECUTE') IS NOT FALSE THEN RAISE EXCEPTION 'Inherited promo EXECUTE remains'; END IF;
 END LOOP;
 FOREACH col IN ARRAY ARRAY['id','name','slug','country','currency','timezone','locale','logo_url','created_at','updated_at','onboarding_completed','onboarding_business_type','onboarding_completed_at','vat_rate_default','vat_regime','vat_country'] LOOP
  IF has_column_privilege('authenticated','public.workspaces',col,'UPDATE') IS NOT TRUE THEN RAISE EXCEPTION 'Configuration grant missing'; END IF;
 END LOOP;
 IF has_table_privilege('service_role','public.workspaces','UPDATE') IS NOT TRUE OR has_function_privilege('service_role','public.increment_promo_code_usage(text)','EXECUTE') IS NOT TRUE THEN RAISE EXCEPTION 'Service privilege missing'; END IF;
END $effective$;
