BEGIN;
LOCK TABLE willflow_video_private.versions,willflow_video_private.links,willflow_video_private.comments,
 willflow_video_private.approvals,willflow_video_private.assets IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM willflow_video_private.versions) OR EXISTS(SELECT 1 FROM willflow_video_private.links)
 OR EXISTS(SELECT 1 FROM willflow_video_private.comments) OR EXISTS(SELECT 1 FROM willflow_video_private.approvals)
 OR EXISTS(SELECT 1 FROM willflow_video_private.assets) THEN RAISE EXCEPTION 'PRIVATE_HISTORY_REQUIRES_FORWARD_RECOVERY'; END IF;
END $$;
-- Before first use only: retire the service RPCs, retain the empty private schema/evidence.
DO $$ DECLARE f record;BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'private_video_%'
 LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM service_role',f.signature);END LOOP;
END $$;
COMMIT;