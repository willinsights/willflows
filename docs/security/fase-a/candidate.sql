BEGIN;
-- Additive only; never apply until callback activation and rollback are approved.
CREATE TABLE public.weekly_summary_deliveries (
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','sent','suppressed','uncertain')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,user_id,week_start)
);
REVOKE ALL ON public.weekly_summary_deliveries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.weekly_summary_deliveries TO service_role;
ALTER TABLE public.weekly_summary_deliveries ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.claim_weekly_summary_delivery(p_workspace uuid,p_user uuid,p_week date)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted integer;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role' = 'service_role') IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_workspace IS NULL OR p_user IS NULL OR p_week IS NULL OR extract(isodow FROM p_week) <> 1 THEN
    RAISE EXCEPTION 'Invalid delivery identity';
  END IF;
  INSERT INTO public.weekly_summary_deliveries(workspace_id,user_id,week_start)
  VALUES(p_workspace,p_user,p_week) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted=ROW_COUNT;
  RETURN inserted=1;
END $$;
REVOKE ALL ON FUNCTION public.claim_weekly_summary_delivery(uuid,uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_weekly_summary_delivery(uuid,uuid,date) TO service_role;

CREATE FUNCTION public.finish_weekly_summary_delivery(p_workspace uuid,p_user uuid,p_week date,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role' = 'service_role') IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('sent','suppressed','uncertain') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.weekly_summary_deliveries SET status=p_status,updated_at=now()
  WHERE workspace_id=p_workspace AND user_id=p_user AND week_start=p_week AND status='reserved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation missing or already completed'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.finish_weekly_summary_delivery(uuid,uuid,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_weekly_summary_delivery(uuid,uuid,date,text) TO service_role;

-- Existing quota trigger watches file_size_bytes, not is_deleted. Keep sizes unchanged.
-- video row locks serialize duplicate deletion, quota row locks serialize other writers.
CREATE FUNCTION public.mark_cleanup_videos_deleted(p_workspace uuid,p_ids uuid[])
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE freed bigint; used bigint;
BEGIN
  IF (current_setting('request.jwt.claims',true)::jsonb->>'role' = 'service_role') IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_workspace IS NULL OR p_ids IS NULL OR cardinality(p_ids) NOT BETWEEN 1 AND 300 OR array_position(p_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid cleanup batch';
  END IF;
  -- Lock quota before video rows: same-workspace batches cannot invert lock order.
  SELECT storage_used_bytes INTO used FROM public.workspace_storage
  WHERE workspace_id=p_workspace FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quota row missing'; END IF;
  PERFORM id FROM public.video_versions WHERE workspace_id=p_workspace AND id=ANY(p_ids) ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.video_versions WHERE workspace_id=p_workspace AND id=ANY(p_ids))
     <> (SELECT count(DISTINCT id) FROM unnest(p_ids) AS ids(id)) THEN
    RAISE EXCEPTION 'Cleanup identity mismatch';
  END IF;
  IF EXISTS(SELECT 1 FROM public.video_versions WHERE workspace_id=p_workspace AND id=ANY(p_ids)
            AND (file_size_bytes<0 OR replacement_file_size_bytes<0)) THEN
    RAISE EXCEPTION 'Invalid stored size';
  END IF;
  WITH changed AS (
    UPDATE public.video_versions SET is_deleted=true,deleted_at=now()
    WHERE workspace_id=p_workspace AND id=ANY(p_ids) AND is_deleted=false
    RETURNING greatest(0,coalesce(file_size_bytes,0)) + greatest(0,coalesce(replacement_file_size_bytes,0)) AS bytes
  ) SELECT coalesce(sum(bytes),0) INTO freed FROM changed;
  IF used IS NULL OR used<freed THEN RAISE EXCEPTION 'Quota inconsistent'; END IF;
  IF freed>0 THEN
    UPDATE public.workspace_storage
    SET storage_used_bytes=storage_used_bytes-freed,last_calculated_at=now()
    WHERE workspace_id=p_workspace;
    IF NOT FOUND THEN RAISE EXCEPTION 'Quota row missing'; END IF;
  END IF;
  RETURN freed;
END $$;
REVOKE ALL ON FUNCTION public.mark_cleanup_videos_deleted(uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_cleanup_videos_deleted(uuid,uuid[]) TO service_role;
COMMIT;