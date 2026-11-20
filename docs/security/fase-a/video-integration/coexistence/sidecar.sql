BEGIN;
-- New-only, additive CANDIDATE. No update/backfill of public versions/tokens.
CREATE SCHEMA willflow_video_private;
REVOKE ALL ON SCHEMA willflow_video_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE willflow_video_private.versions (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,project_id uuid NOT NULL,task_id uuid,
 author_id uuid NOT NULL,file_name text NOT NULL CHECK(length(file_name) BETWEEN 1 AND 255),
 bytes bigint NOT NULL CHECK(bytes>0),object_key text NOT NULL UNIQUE,
 operation_id uuid NOT NULL UNIQUE,state text NOT NULL DEFAULT 'issued'
 CHECK(state IN ('issued','persisted','submitting','uncertain','ready','aborted','withdrawn')),
 generation integer NOT NULL DEFAULT 1,stream_uid text UNIQUE,submission_id uuid,
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE willflow_video_private.links (
 digest text PRIMARY KEY CHECK(digest ~ '^[0-9a-f]{64}$'),workspace_id uuid NOT NULL,
 project_id uuid NOT NULL,task_id uuid,active boolean NOT NULL DEFAULT true,
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE willflow_video_private.comments (
 id uuid PRIMARY KEY,request_id uuid NOT NULL UNIQUE,version_id uuid NOT NULL,
 digest text NOT NULL,name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000),timestamp_seconds numeric NOT NULL CHECK(timestamp_seconds>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE willflow_video_private.approvals (
 request_id uuid PRIMARY KEY,version_id uuid NOT NULL UNIQUE,digest text NOT NULL,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),notes text CHECK(length(notes)<=5000),
 approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE willflow_video_private.assets (
 provider text NOT NULL CHECK(provider IN ('r2','stream')),key text NOT NULL,
 version_id uuid NOT NULL,reason text NOT NULL,PRIMARY KEY(provider,key)
);
CREATE TABLE willflow_video_private.enrollment (
 workspace_id uuid PRIMARY KEY,enabled boolean NOT NULL DEFAULT false
);
-- No FKs/cascades: parent removal denies readers but must retain recovery evidence.
REVOKE ALL ON ALL TABLES IN SCHEMA willflow_video_private FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE willflow_video_private.versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE willflow_video_private.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE willflow_video_private.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE willflow_video_private.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE willflow_video_private.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE willflow_video_private.enrollment ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION willflow_video_private.service_check() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$BEGIN
 IF (current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role') IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden'; END IF;
END $$;
CREATE FUNCTION willflow_video_private.context_exists(p_ws uuid,p_project uuid,p_task uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.projects WHERE id=p_project AND workspace_id=p_ws)
 AND (p_task IS NULL OR EXISTS(SELECT 1 FROM public.tasks WHERE id=p_task AND project_id=p_project));
$$;
CREATE FUNCTION willflow_video_private.editor(p_ws uuid,p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT p_user IS NOT NULL AND EXISTS(SELECT 1 FROM public.workspace_members
 WHERE workspace_id=p_ws AND user_id=p_user AND is_active AND role::text IN ('admin','edicao'));
$$;
CREATE FUNCTION willflow_video_private.permitted(v willflow_video_private.versions,p_user uuid,p_digest text) RETURNS boolean
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT v.state NOT IN ('issued','aborted','withdrawn')
 AND willflow_video_private.context_exists(v.workspace_id,v.project_id,v.task_id)
 AND ((p_digest IS NULL AND p_user IS NOT NULL AND EXISTS(SELECT 1 FROM public.workspace_members
 WHERE workspace_id=v.workspace_id AND user_id=p_user AND is_active))
 OR (p_digest IS NOT NULL AND EXISTS(SELECT 1 FROM willflow_video_private.links l
 WHERE l.digest=p_digest AND l.active AND l.expires_at>clock_timestamp()
 AND l.workspace_id=v.workspace_id AND l.project_id=v.project_id AND l.task_id IS NOT DISTINCT FROM v.task_id)));
$$;

CREATE FUNCTION public.private_video_issue(p_operation uuid,p_ws uuid,p_project uuid,p_task uuid,p_user uuid,p_name text,p_bytes bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions; available bigint;
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 IF NOT EXISTS(SELECT 1 FROM willflow_video_private.enrollment WHERE workspace_id=p_ws AND enabled) THEN RAISE EXCEPTION 'Private uploads disabled'; END IF;
 IF p_operation IS NULL OR p_ws IS NULL OR p_project IS NULL OR p_user IS NULL OR p_name IS NULL OR length(p_name) NOT BETWEEN 1 AND 255 OR p_bytes IS NULL OR p_bytes<=0
 OR NOT willflow_video_private.context_exists(p_ws,p_project,p_task) OR NOT willflow_video_private.editor(p_ws,p_user) THEN RAISE EXCEPTION 'Invalid issuance'; END IF;
 SELECT * INTO v FROM willflow_video_private.versions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF ROW(v.workspace_id,v.project_id,v.task_id,v.author_id,v.file_name,v.bytes) IS DISTINCT FROM ROW(p_ws,p_project,p_task,p_user,p_name,p_bytes) THEN RAISE EXCEPTION 'Operation mismatch'; END IF;
 ELSE
  SELECT storage_limit_bytes-storage_used_bytes-coalesce((SELECT sum(bytes) FROM willflow_video_private.versions
   WHERE workspace_id=p_ws AND (state NOT IN ('issued','aborted','withdrawn') OR (state='issued' AND expires_at>clock_timestamp()))),0)
   INTO available FROM public.workspace_storage WHERE workspace_id=p_ws;
  IF available IS NULL OR available<p_bytes THEN RAISE EXCEPTION 'Quota unavailable'; END IF;
  INSERT INTO willflow_video_private.versions(id,workspace_id,project_id,task_id,author_id,file_name,bytes,object_key,operation_id,expires_at)
   VALUES(gen_random_uuid(),p_ws,p_project,p_task,p_user,p_name,p_bytes,'__willflow_v2/'||p_ws||'/'||p_operation||'/input.mp4',p_operation,clock_timestamp()+interval '2 hours') RETURNING * INTO v;
 END IF;
 RETURN to_jsonb(v);
END $$;
CREATE FUNCTION public.private_video_operation(p_operation uuid,p_user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions;
BEGIN
 PERFORM willflow_video_private.service_check();
 SELECT * INTO v FROM willflow_video_private.versions WHERE operation_id=p_operation;
 IF NOT FOUND OR v.author_id IS DISTINCT FROM p_user OR NOT willflow_video_private.editor(v.workspace_id,p_user)
 OR NOT willflow_video_private.context_exists(v.workspace_id,v.project_id,v.task_id) THEN RAISE EXCEPTION 'Operation mismatch'; END IF;
 RETURN to_jsonb(v);
END $$;
CREATE FUNCTION public.private_video_hold(p_operation uuid,p_claim uuid,p_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions;
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 SELECT * INTO v FROM willflow_video_private.versions WHERE operation_id=p_operation AND submission_id=p_claim AND state='submitting';
 IF NOT FOUND OR p_key IS DISTINCT FROM '__willflow_v2/'||v.workspace_id||'/'||v.operation_id||'/frozen.mp4' THEN RAISE EXCEPTION 'Invalid snapshot'; END IF;
 INSERT INTO willflow_video_private.assets VALUES('r2',p_key,v.id,'provider_snapshot') ON CONFLICT DO NOTHING;RETURN true;
END $$;
CREATE FUNCTION public.private_video_recover(p_operation uuid,p_user uuid,p_claim uuid,p_uid text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions;
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 SELECT * INTO v FROM willflow_video_private.versions WHERE operation_id=p_operation FOR UPDATE;
 IF NOT FOUND OR v.author_id IS DISTINCT FROM p_user OR v.submission_id IS DISTINCT FROM p_claim OR v.state NOT IN ('submitting','uncertain')
 OR NOT willflow_video_private.editor(v.workspace_id,p_user) OR NOT willflow_video_private.context_exists(v.workspace_id,v.project_id,v.task_id)
 OR p_uid IS NULL OR p_uid !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'Invalid recovery'; END IF;
 IF EXISTS(SELECT 1 FROM public.video_versions WHERE cloudflare_stream_uid=p_uid OR replacement_stream_uid=p_uid) THEN RAISE EXCEPTION 'Legacy provider identity'; END IF;
 INSERT INTO willflow_video_private.assets VALUES('stream',p_uid,v.id,'recovered_provider');
 UPDATE willflow_video_private.versions SET stream_uid=p_uid,state='ready' WHERE id=v.id;RETURN true;
END $$;
CREATE FUNCTION public.private_video_persist(p_operation uuid,p_user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions;
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 SELECT * INTO v FROM willflow_video_private.versions WHERE operation_id=p_operation FOR UPDATE;
 IF NOT FOUND OR v.author_id IS DISTINCT FROM p_user OR NOT willflow_video_private.editor(v.workspace_id,p_user)
 OR NOT willflow_video_private.context_exists(v.workspace_id,v.project_id,v.task_id) THEN RAISE EXCEPTION 'Operation mismatch'; END IF;
 IF v.state IN ('aborted','withdrawn') OR (v.state='issued' AND v.expires_at<=clock_timestamp()) THEN RAISE EXCEPTION 'Expired or unavailable'; END IF;
 IF v.state='issued' THEN UPDATE willflow_video_private.versions SET state='persisted' WHERE id=v.id RETURNING * INTO v; END IF;
 RETURN to_jsonb(v);
END $$;
CREATE FUNCTION public.private_video_claim(p_operation uuid,p_user uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claim uuid;
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 UPDATE willflow_video_private.versions v SET state='submitting',submission_id=gen_random_uuid()
 WHERE operation_id=p_operation AND author_id=p_user AND state='persisted'
 AND willflow_video_private.editor(v.workspace_id,p_user) AND willflow_video_private.context_exists(v.workspace_id,v.project_id,v.task_id)
 RETURNING submission_id INTO claim;RETURN claim;
END $$;
CREATE FUNCTION public.private_video_finish(p_operation uuid,p_claim uuid,p_uid text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions;
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 SELECT * INTO v FROM willflow_video_private.versions WHERE operation_id=p_operation AND submission_id=p_claim FOR UPDATE;
 IF NOT FOUND OR v.state<>'submitting' THEN RAISE EXCEPTION 'Stale provider claim'; END IF;
 IF p_uid IS NULL THEN UPDATE willflow_video_private.versions SET state='uncertain' WHERE id=v.id; RETURN false; END IF;
 IF p_uid !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'Invalid provider identity'; END IF;
 IF EXISTS(SELECT 1 FROM public.video_versions WHERE cloudflare_stream_uid=p_uid OR replacement_stream_uid=p_uid) THEN RAISE EXCEPTION 'Legacy provider identity'; END IF;
 INSERT INTO willflow_video_private.assets VALUES('stream',p_uid,v.id,'accepted_provider') ON CONFLICT DO NOTHING;
 IF NOT willflow_video_private.context_exists(v.workspace_id,v.project_id,v.task_id) THEN
  UPDATE willflow_video_private.versions SET state='uncertain' WHERE id=v.id;RETURN false;
 END IF;
 UPDATE willflow_video_private.versions SET stream_uid=p_uid,state='ready' WHERE id=v.id;RETURN true;
 -- "ready" here denotes a confirmed association; runtime must verify provider readyToStream before signing.
END $$;
CREATE FUNCTION public.private_video_withdraw(p_operation uuid,p_user uuid,p_abort boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions;
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 SELECT * INTO v FROM willflow_video_private.versions WHERE operation_id=p_operation FOR UPDATE;
 IF NOT FOUND OR NOT willflow_video_private.editor(v.workspace_id,p_user) OR NOT willflow_video_private.context_exists(v.workspace_id,v.project_id,v.task_id)
 OR (p_abort IS TRUE AND (v.author_id<>p_user OR v.state NOT IN ('issued','aborted'))) THEN RAISE EXCEPTION 'Forbidden withdrawal'; END IF;
 IF v.state IN ('submitting','uncertain') THEN RAISE EXCEPTION 'Uncertain provider must be reconciled'; END IF;
 INSERT INTO willflow_video_private.assets VALUES('r2',v.object_key,v.id,'withdraw_or_abort') ON CONFLICT DO NOTHING;
 IF v.stream_uid IS NOT NULL THEN INSERT INTO willflow_video_private.assets VALUES('stream',v.stream_uid,v.id,'withdraw_or_abort') ON CONFLICT DO NOTHING; END IF;
 UPDATE willflow_video_private.versions SET state=CASE WHEN p_abort THEN 'aborted' ELSE 'withdrawn' END WHERE id=v.id;RETURN true;
END $$;

CREATE FUNCTION public.private_video_link(p_digest text,p_ws uuid,p_project uuid,p_task uuid,p_user uuid,p_expires timestamptz) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 IF p_digest IS NULL OR p_digest !~ '^[0-9a-f]{64}$' OR p_expires IS NULL OR p_expires<=clock_timestamp()
 OR NOT willflow_video_private.editor(p_ws,p_user) OR NOT willflow_video_private.context_exists(p_ws,p_project,p_task) THEN RAISE EXCEPTION 'Invalid link'; END IF;
 INSERT INTO willflow_video_private.links(digest,workspace_id,project_id,task_id,expires_at) VALUES(p_digest,p_ws,p_project,p_task,p_expires);
 RETURN true;
END $$;
CREATE FUNCTION public.private_video_revoke(p_digest text,p_user uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 UPDATE willflow_video_private.links SET active=false WHERE digest=p_digest AND willflow_video_private.editor(workspace_id,p_user);
 RETURN FOUND;
END $$;
CREATE FUNCTION public.private_video_read(p_version uuid,p_user uuid DEFAULT NULL,p_digest text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions;
BEGIN
 PERFORM willflow_video_private.service_check();
 SELECT * INTO v FROM willflow_video_private.versions WHERE id=p_version;
 IF NOT FOUND OR NOT willflow_video_private.permitted(v,p_user,p_digest) THEN RAISE EXCEPTION 'Forbidden reader'; END IF;
 RETURN jsonb_build_object('version',to_jsonb(v),'comments',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM willflow_video_private.comments c WHERE version_id=v.id),'[]'::jsonb),
 'approval',(SELECT to_jsonb(a) FROM willflow_video_private.approvals a WHERE version_id=v.id));
END $$;
CREATE FUNCTION public.private_video_list(p_user uuid DEFAULT NULL,p_digest text DEFAULT NULL,p_ws uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM willflow_video_private.service_check();
 IF p_digest IS NOT NULL AND NOT EXISTS(SELECT 1 FROM willflow_video_private.links l WHERE l.digest=p_digest AND l.active AND l.expires_at>clock_timestamp()
 AND willflow_video_private.context_exists(l.workspace_id,l.project_id,l.task_id)) THEN RAISE EXCEPTION 'Forbidden reader'; END IF;
 IF p_digest IS NULL AND (p_ws IS NULL OR p_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id=p_ws AND user_id=p_user AND is_active)) THEN RAISE EXCEPTION 'Forbidden reader'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'file_name',v.file_name,'created_at',v.created_at) ORDER BY created_at)
 FROM willflow_video_private.versions v WHERE (p_digest IS NOT NULL OR v.workspace_id=p_ws) AND willflow_video_private.permitted(v,p_user,p_digest)),'[]'::jsonb);
END $$;
CREATE FUNCTION public.private_video_feedback(p_request uuid,p_version uuid,p_digest text,p_type text,p_name text,p_body text,p_timestamp numeric DEFAULT 0) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v willflow_video_private.versions; existing jsonb;
BEGIN
 PERFORM willflow_video_private.service_check();PERFORM pg_advisory_xact_lock(742019,1);
 SELECT * INTO v FROM willflow_video_private.versions WHERE id=p_version FOR UPDATE;
 IF NOT FOUND OR p_digest IS NULL OR NOT willflow_video_private.permitted(v,NULL,p_digest) OR p_request IS NULL
 OR p_type IS NULL OR p_type NOT IN ('comment','approval') OR p_name IS NULL OR length(p_name) NOT BETWEEN 1 AND 120
 OR p_body IS NULL OR length(p_body)>5000 OR p_timestamp IS NULL OR p_timestamp<0 THEN RAISE EXCEPTION 'Invalid feedback'; END IF;
 IF EXISTS(SELECT 1 FROM willflow_video_private.comments WHERE request_id=p_request AND (p_type<>'comment' OR ROW(version_id,digest,name,body,timestamp_seconds) IS DISTINCT FROM ROW(p_version,p_digest,p_name,p_body,p_timestamp)))
 OR EXISTS(SELECT 1 FROM willflow_video_private.approvals WHERE request_id=p_request AND (p_type<>'approval' OR ROW(version_id,digest,name,notes) IS DISTINCT FROM ROW(p_version,p_digest,p_name,p_body))) THEN RAISE EXCEPTION 'Feedback identity mismatch'; END IF;
 IF p_type='comment' THEN
  IF length(p_body)=0 THEN RAISE EXCEPTION 'Empty comment'; END IF;
  INSERT INTO willflow_video_private.comments VALUES(gen_random_uuid(),p_request,p_version,p_digest,p_name,p_body,p_timestamp,now()) ON CONFLICT(request_id) DO NOTHING;
 ELSE
  INSERT INTO willflow_video_private.approvals VALUES(p_request,p_version,p_digest,p_name,p_body,now()) ON CONFLICT(request_id) DO NOTHING;
 END IF;RETURN true;
END $$;

-- Keep private allocations outside the legacy counter. Their total remains part of entitlement.
CREATE FUNCTION public.private_video_usage(p_ws uuid,p_user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM willflow_video_private.service_check();
 IF NOT EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id=p_ws AND user_id=p_user AND is_active) THEN RAISE EXCEPTION 'Forbidden usage'; END IF;
 RETURN (SELECT jsonb_build_object('legacy_bytes',storage_used_bytes,'private_bytes',coalesce((SELECT sum(bytes) FROM willflow_video_private.versions
 WHERE workspace_id=p_ws AND state NOT IN ('issued','aborted','withdrawn')),0),'limit_bytes',storage_limit_bytes) FROM public.workspace_storage WHERE workspace_id=p_ws);
END $$;
-- Not installed on storage yet: legacy RMW/trigger normalization and fresh baseline must precede a pilot.
CREATE FUNCTION public.guard_private_video_budget() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE allocated bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(742019,1);
 SELECT coalesce(sum(bytes),0) INTO allocated FROM willflow_video_private.versions
 WHERE workspace_id=NEW.workspace_id AND (state NOT IN ('issued','aborted','withdrawn') OR (state='issued' AND expires_at>clock_timestamp()));
 IF allocated>0 AND NEW.storage_used_bytes+allocated>NEW.storage_limit_bytes THEN RAISE EXCEPTION 'Private video quota reserved'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.guard_private_video_projection() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(742019,1);
 IF NEW.r2_key LIKE '__willflow_v2/%' OR NEW.replacement_r2_key LIKE '__willflow_v2/%'
 OR EXISTS(SELECT 1 FROM willflow_video_private.versions v WHERE v.id=NEW.id
 OR v.stream_uid IN (NEW.cloudflare_stream_uid,NEW.replacement_stream_uid))
 OR EXISTS(SELECT 1 FROM willflow_video_private.assets a WHERE a.provider='stream' AND a.key IN (NEW.cloudflare_stream_uid,NEW.replacement_stream_uid)) THEN RAISE EXCEPTION 'Private assets cannot enter legacy projection'; END IF;
 RETURN NEW;
END $$;
-- Only bundled after statement-lock normalization: this guard prevents a future reader/adapter leaking identities.

-- Service-only RPCs; no new browser grants or private schema access.
DO $acl$ DECLARE f record;BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('private_video_issue','private_video_operation','private_video_hold','private_video_recover','private_video_persist','private_video_claim','private_video_finish','private_video_withdraw','private_video_link','private_video_revoke','private_video_read','private_video_list','private_video_feedback','private_video_usage')
 LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);END LOOP;
END $acl$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA willflow_video_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_private_video_budget() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_private_video_projection() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;