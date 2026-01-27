-- Fix remaining SECURITY DEFINER functions without search_path
ALTER FUNCTION public.sync_project_chat_member() SET search_path = public;
ALTER FUNCTION public.convert_invitation_to_member() SET search_path = public;