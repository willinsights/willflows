-- SPECIFIC REVERSAL ONLY; separate authorization and fresh catalog check required.
BEGIN;
DROP FUNCTION IF EXISTS public.admin_manage_workspace_billing(uuid,text,integer,text);
CREATE OR REPLACE FUNCTION public.increment_promo_code_usage(code_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE promo_codes 
  SET used_count = used_count + 1 
  WHERE code = code_text;
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_promo_code_usage(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_promo_code_usage(text) TO PUBLIC, anon, authenticated, service_role;
REVOKE UPDATE (name, slug, country, currency, timezone, locale, logo_url, updated_at, vat_rate_default, vat_regime, vat_country) ON public.workspaces FROM authenticated;
GRANT INSERT, UPDATE ON public.workspaces TO anon, authenticated;
COMMIT;
