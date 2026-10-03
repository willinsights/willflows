REVOKE EXECUTE ON FUNCTION public.guard_closed_month_projects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_closed_month_team() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_month_closed(uuid, timestamptz) FROM authenticated;