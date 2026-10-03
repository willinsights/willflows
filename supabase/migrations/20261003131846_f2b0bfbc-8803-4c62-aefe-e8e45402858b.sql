REVOKE EXECUTE ON FUNCTION public.decrypt_oauth_token(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_oauth_token(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_oauth_token(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.encrypt_oauth_token(text, uuid) TO service_role;