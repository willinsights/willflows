-- Additive PRE-CUTOVER instrumentation, intentionally outside migration journals.
BEGIN;
CREATE SCHEMA willflow_video_control;
REVOKE ALL ON SCHEMA willflow_video_control FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE willflow_video_control.state (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 instrumented_at timestamptz,
 legacy_not_before timestamptz,
 pause_until timestamptz,
 frozen boolean NOT NULL DEFAULT false,
 coordinated boolean NOT NULL DEFAULT false
);
CREATE TABLE willflow_video_control.executions (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('issue','process','cleanup')),
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 heartbeat_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_until timestamptz NOT NULL DEFAULT clock_timestamp()+interval '90 seconds',
 finished_at timestamptz, outcome text CHECK(outcome IN ('done','uncertain'))
);
CREATE TABLE willflow_video_control.grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), execution_id uuid NOT NULL REFERENCES willflow_video_control.executions,
 expires_at timestamptz NOT NULL, issued_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON ALL TABLES IN SCHEMA willflow_video_control FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE willflow_video_control.state ENABLE ROW LEVEL SECURITY;
ALTER TABLE willflow_video_control.executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE willflow_video_control.grants ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.begin_video_execution(p_id uuid,p_kind text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s willflow_video_control.state%ROWTYPE;
BEGIN
 IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(742019,1);
 IF p_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('issue','process','cleanup') THEN RAISE EXCEPTION 'Invalid execution'; END IF;
 SELECT * INTO s FROM willflow_video_control.state WHERE singleton;
 IF (s.frozen AND s.pause_until>clock_timestamp()) OR (p_kind='cleanup' AND s.coordinated) OR
   (p_kind IN ('issue','cleanup') AND s.pause_until>clock_timestamp()) THEN RETURN false; END IF;
 INSERT INTO willflow_video_control.executions(id,kind) VALUES(p_id,p_kind) ON CONFLICT DO NOTHING;
 RETURN FOUND; -- Never reclaim/replay an execution, even after lease expiry.
END $$;
CREATE FUNCTION public.check_video_execution(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE willflow_video_control.executions SET heartbeat_at=clock_timestamp(),lease_until=clock_timestamp()+interval '90 seconds'
 WHERE id=p_id AND finished_at IS NULL AND outcome IS NULL AND lease_until>clock_timestamp();
 RETURN FOUND;
END $$;
CREATE FUNCTION public.finish_video_execution(p_id uuid,p_ok boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE willflow_video_control.executions SET
 finished_at=CASE WHEN p_ok IS TRUE THEN clock_timestamp() ELSE NULL END,
 outcome=CASE WHEN p_ok IS TRUE THEN 'done' ELSE 'uncertain' END
 WHERE id=p_id AND finished_at IS NULL AND outcome IS NULL AND (p_ok IS NOT TRUE OR lease_until>clock_timestamp());
 RETURN FOUND;
END $$;
CREATE FUNCTION public.record_video_grant(p_execution uuid,p_expires timestamptz) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text;
BEGIN
 IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(742019,1);
 SELECT kind INTO k FROM willflow_video_control.executions WHERE id=p_execution AND finished_at IS NULL
  AND outcome IS NULL AND lease_until>clock_timestamp();
 IF k IS DISTINCT FROM 'issue' OR p_expires IS NULL OR p_expires<=clock_timestamp()
 OR p_expires>clock_timestamp()+interval '2 hours' THEN RAISE EXCEPTION 'Invalid grant'; END IF;
 INSERT INTO willflow_video_control.grants(execution_id,expires_at) VALUES(p_execution,p_expires);
 RETURN true; -- Written BEFORE returning any presigned PUT/ticket to the caller.
END $$;
CREATE FUNCTION public.video_control_status() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s willflow_video_control.state%ROWTYPE;
BEGIN
 IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO s FROM willflow_video_control.state WHERE singleton;
 RETURN jsonb_build_object('instrumented_at',s.instrumented_at,'legacy_not_before',s.legacy_not_before,
 'pause_until',s.pause_until,'frozen',coalesce(s.frozen AND s.pause_until>clock_timestamp(),false),'coordinated',coalesce(s.coordinated,false),
 'active_executions',(SELECT count(*) FROM willflow_video_control.executions WHERE finished_at IS NULL),
 'uncertain_executions',(SELECT count(*) FROM willflow_video_control.executions WHERE finished_at IS NULL AND (outcome='uncertain' OR lease_until<=clock_timestamp())),
 'outstanding_grants',(SELECT count(*) FROM willflow_video_control.grants WHERE expires_at>clock_timestamp()));
END $$;
REVOKE ALL ON FUNCTION public.begin_video_execution(uuid,text),public.check_video_execution(uuid),public.finish_video_execution(uuid,boolean),public.record_video_grant(uuid,timestamptz),public.video_control_status() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_video_execution(uuid,text),public.check_video_execution(uuid),public.finish_video_execution(uuid,boolean),public.record_video_grant(uuid,timestamptz),public.video_control_status() TO service_role;

-- Owner-only control, no public RPC/operator endpoint or new privileges.
CREATE FUNCTION willflow_video_control.pause(p_instrumented timestamptz,p_legacy_seconds integer,p_minutes integer) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Owner required'; END IF;
 IF p_instrumented IS NULL OR p_instrumented>clock_timestamp() OR p_legacy_seconds IS NULL OR p_legacy_seconds NOT BETWEEN 3600 AND 7200
 OR p_minutes IS NULL OR p_minutes NOT BETWEEN 1 AND 180 THEN RAISE EXCEPTION 'Invalid window'; END IF;
 PERFORM pg_advisory_xact_lock(742019,1);
 INSERT INTO willflow_video_control.state(singleton,instrumented_at,legacy_not_before,pause_until)
 VALUES(true,p_instrumented,p_instrumented+make_interval(secs=>p_legacy_seconds),clock_timestamp()+make_interval(mins=>p_minutes))
 ON CONFLICT(singleton) DO UPDATE SET instrumented_at=EXCLUDED.instrumented_at,
 legacy_not_before=EXCLUDED.legacy_not_before,pause_until=EXCLUDED.pause_until;
END $$;
CREATE FUNCTION willflow_video_control.freeze() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s willflow_video_control.state%ROWTYPE;
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Owner required'; END IF;
 PERFORM pg_advisory_xact_lock(742019,1);
 SELECT * INTO s FROM willflow_video_control.state WHERE singleton;
 IF s.pause_until IS NULL OR s.pause_until<=clock_timestamp() OR s.legacy_not_before IS NULL OR s.legacy_not_before>clock_timestamp()
 OR EXISTS(SELECT 1 FROM willflow_video_control.executions WHERE finished_at IS NULL)
 OR EXISTS(SELECT 1 FROM willflow_video_control.grants WHERE expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'Drain not proven'; END IF;
 UPDATE willflow_video_control.state SET frozen=true WHERE singleton;
END $$;
CREATE FUNCTION willflow_video_control.resume() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Owner required'; END IF;
 PERFORM pg_advisory_xact_lock(742019,1);
 UPDATE willflow_video_control.state SET pause_until=NULL,frozen=false WHERE singleton;
END $$;
REVOKE ALL ON FUNCTION willflow_video_control.pause(timestamptz,integer,integer),willflow_video_control.freeze(),willflow_video_control.resume() FROM PUBLIC,anon,authenticated,service_role;

-- Statement fence includes browser writes, legacy RPC writes, deletes and cascades.
CREATE FUNCTION public.fence_video_cutover() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(742019,1);
 IF EXISTS(SELECT 1 FROM willflow_video_control.state WHERE singleton AND frozen AND pause_until>clock_timestamp())
 THEN RAISE EXCEPTION 'Video maintenance'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.fence_video_cutover() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER video_cutover_fence BEFORE INSERT OR UPDATE OR DELETE ON public.video_versions FOR EACH STATEMENT EXECUTE FUNCTION public.fence_video_cutover();
CREATE TRIGGER storage_cutover_fence BEFORE INSERT OR UPDATE OR DELETE ON public.workspace_storage FOR EACH STATEMENT EXECUTE FUNCTION public.fence_video_cutover();
COMMIT;