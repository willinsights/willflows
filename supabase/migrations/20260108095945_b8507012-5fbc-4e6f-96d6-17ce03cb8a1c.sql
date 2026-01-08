-- Fix function search_path mutable warning
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.create_default_kanban_columns() SET search_path = public;