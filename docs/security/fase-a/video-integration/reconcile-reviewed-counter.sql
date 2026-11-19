-- Generated inside the accounting transaction, after acquiring its table locks.
-- Variables are validated by assemble_candidate.py. The default migration has no correction.
CREATE TEMP TABLE reviewed_video_counter ON COMMIT DROP AS
SELECT * FROM (
__BASELINE_QUERY__
) AS current_baseline
WHERE workspace_id = '__WORKSPACE__'::uuid
  AND stored_bytes = __STORED__ AND active_bytes = __ACTIVE__ AND active_versions = __COUNT__
  AND unverified_sizes = 0 AND snapshot_hash = '__HASH__';

DO $check$
BEGIN
  IF (SELECT count(*) FROM pg_temp.reviewed_video_counter) <> 1 THEN
    RAISE EXCEPTION 'REVIEWED_VIDEO_COUNTER_CHANGED';
  END IF;
END $check$;

CREATE TABLE public.video_counter_reconciliations (
  workspace_id uuid PRIMARY KEY, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  recorded_by name NOT NULL DEFAULT current_user,
  previous_bytes bigint NOT NULL, corrected_bytes bigint NOT NULL,
  active_versions bigint NOT NULL, snapshot_hash text NOT NULL
);
ALTER TABLE public.video_counter_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.video_counter_reconciliations FROM PUBLIC, anon, authenticated, service_role;

DO $apply$
BEGIN
  INSERT INTO public.video_counter_reconciliations(workspace_id, previous_bytes, corrected_bytes, active_versions, snapshot_hash)
    SELECT workspace_id, stored_bytes, active_bytes, active_versions, snapshot_hash FROM pg_temp.reviewed_video_counter;
  UPDATE public.workspace_storage AS s
    SET storage_used_bytes = r.active_bytes, last_calculated_at = now()
    FROM pg_temp.reviewed_video_counter AS r
    WHERE s.workspace_id = r.workspace_id AND s.storage_used_bytes = r.stored_bytes;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVIEWED_VIDEO_COUNTER_CHANGED'; END IF;
END $apply$;
