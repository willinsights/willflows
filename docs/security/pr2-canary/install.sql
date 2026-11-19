CREATE SCHEMA willflow_pr2_canary_private;
REVOKE ALL ON SCHEMA willflow_pr2_canary_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE willflow_pr2_canary_private.dispatch (
 id uuid PRIMARY KEY,
 singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
 signature_digest bytea NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 claimed_at timestamptz,
 finished_at timestamptz,
 request_id bigint,
 proof jsonb
);
REVOKE ALL ON willflow_pr2_canary_private.dispatch FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE willflow_pr2_canary_private.dispatch ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION willflow_pr2_canary_private.enqueue()
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid := gen_random_uuid(); v_signature text; v_request bigint;
BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'owner required'; END IF;
 IF EXISTS (SELECT 1 FROM willflow_pr2_canary_private.dispatch) THEN RAISE EXCEPTION 'canary already issued'; END IF;
 v_signature := encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO willflow_pr2_canary_private.dispatch(id,signature_digest,expires_at)
 VALUES(v_id,extensions.digest(convert_to(v_signature,'UTF8'),'sha256'),clock_timestamp()+interval '90 seconds');
 SELECT net.http_post(
  url:='https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/pr2-video-canary',
  headers:=jsonb_build_object('Content-Type','application/json','x-pr2-dispatch',v_id::text,'x-pr2-signature',v_signature),
  body:='{}'::jsonb,timeout_milliseconds:=60000) INTO v_request;
 UPDATE willflow_pr2_canary_private.dispatch SET request_id=v_request WHERE id=v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION willflow_pr2_canary_private.enqueue() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.claim_pr2_video_canary(p_id uuid,p_digest text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_digest IS NULL OR p_digest !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
 UPDATE willflow_pr2_canary_private.dispatch SET claimed_at=clock_timestamp()
 WHERE id=p_id AND claimed_at IS NULL AND expires_at>clock_timestamp()
 AND issued_at<=clock_timestamp() AND signature_digest=decode(p_digest,'hex');
 RETURN FOUND;
END $$;
CREATE FUNCTION public.finish_pr2_video_canary(p_id uuid,p_proof jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_proof IS NULL OR jsonb_typeof(p_proof)<>'object' OR octet_length(p_proof::text)>16000 THEN RETURN false; END IF;
 UPDATE willflow_pr2_canary_private.dispatch SET finished_at=clock_timestamp(),proof=p_proof
 WHERE id=p_id AND claimed_at IS NOT NULL AND finished_at IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_pr2_video_canary(uuid,text),public.finish_pr2_video_canary(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pr2_video_canary(uuid,text),public.finish_pr2_video_canary(uuid,jsonb) TO service_role;