DROP POLICY IF EXISTS "Anyone can insert contract views" ON public.contract_views;

REVOKE INSERT ON public.contract_views FROM anon, authenticated;
GRANT ALL ON public.contract_views TO service_role;

CREATE OR REPLACE FUNCTION public.mark_contract_viewed(_token text, _user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract RECORD;
BEGIN
  IF _token IS NULL OR trim(_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  SELECT id, status, expires_at
  INTO v_contract
  FROM public.contracts
  WHERE signature_token = _token;

  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_contract.status = 'cancelled'
     OR (v_contract.expires_at IS NOT NULL AND v_contract.expires_at < now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_available');
  END IF;

  IF v_contract.status = 'sent' THEN
    UPDATE public.contracts
    SET status = 'viewed', viewed_at = now()
    WHERE id = v_contract.id;

    INSERT INTO public.contract_views (contract_id, user_agent)
    VALUES (v_contract.id, left(coalesce(_user_agent, ''), 500));
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_contract_viewed(text, text) TO anon, authenticated;
