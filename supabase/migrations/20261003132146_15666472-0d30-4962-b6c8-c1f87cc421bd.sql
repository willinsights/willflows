DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname = ANY(ARRAY[
      'can_access_realtime_topic','can_edit_project','can_manage_conversation_members',
      'get_workspace_role','has_workspace_permission','hash_email',
      'is_conversation_member','is_conversation_member_secure',
      'is_project_chat_in_user_workspace','is_public_channel_in_user_workspace',
      'is_workspace_admin','is_workspace_member'])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.proname, r.args);
  END LOOP;
END $$;