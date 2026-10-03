DO $$
DECLARE
  r record;
  anon_allow text[] := ARRAY[
    'get_contract_by_token','mark_contract_viewed','sign_contract_public',
    'get_invitation_by_token','verify_invitation_token','is_valid_invitation_token','hash_invitation_token',
    'verify_beta_token','validate_promo_code','increment_promo_code_usage','record_promo_redemption',
    'get_video_approval_token','check_public_rate_limit','log_public_access_attempt'
  ];
  service_only text[] := ARRAY[
    'delete_email','email_queue_dispatch','enqueue_email','read_email_batch','move_to_dlq',
    'webhook_inbox_claim_batch','webhook_inbox_mark_failed','webhook_inbox_mark_processed',
    'add_workspace_storage','claim_automation_jobs','complete_automation_job'
  ];
  policy_text text;
BEGIN
  SELECT string_agg(coalesce(qual,'')||' '||coalesce(with_check,''),' ') INTO policy_text FROM pg_policies;

  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS res
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    -- Functions used inside RLS policies stay as they are (anon queries may evaluate them)
    CONTINUE WHEN policy_text ~ ('\m' || r.proname || '\(');

    IF r.res = 'trigger' OR r.proname = ANY(service_only) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
    ELSIF NOT (r.proname = ANY(anon_allow)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.proname, r.args);
    END IF;
  END LOOP;
END $$;