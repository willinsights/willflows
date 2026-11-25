CREATE FUNCTION public.private_video_link_status(p_digest text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM willflow_video_private.service_check();
 RETURN EXISTS(SELECT 1 FROM willflow_video_private.links WHERE digest=p_digest AND active AND expires_at>clock_timestamp());
END $$;
DO $acl$ BEGIN
 EXECUTE 'REVOKE ALL ON FUNCTION public.private_video_link_status(text) FROM PUBLIC,anon,authenticated';
 EXECUTE 'GRANT EXECUTE ON FUNCTION public.private_video_link_status(text) TO service_role';
END $acl$;