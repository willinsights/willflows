-- 1. Status enum
DO $$ BEGIN
  CREATE TYPE public.automation_job_status AS ENUM ('pending','running','done','failed','dead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table
CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.automation_job_status NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  last_error text,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_automation_jobs_ready
  ON public.automation_jobs (next_run_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_automation_jobs_workspace_status
  ON public.automation_jobs (workspace_id, status, created_at DESC);

-- 3. RLS
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view automation jobs" ON public.automation_jobs;
CREATE POLICY "Workspace members can view automation jobs"
  ON public.automation_jobs FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- No INSERT/UPDATE/DELETE policies: writes go through SECURITY DEFINER RPCs or service role.

-- 4. Enqueue RPC (callable by workspace members)
CREATE OR REPLACE FUNCTION public.enqueue_automation_job(
  _workspace_id uuid,
  _event_type text,
  _payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _job_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_workspace_member(_workspace_id, _uid) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  INSERT INTO public.automation_jobs (workspace_id, event_type, payload, created_by)
  VALUES (_workspace_id, _event_type, COALESCE(_payload, '{}'::jsonb), _uid)
  RETURNING id INTO _job_id;

  RETURN _job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_automation_job(uuid, text, jsonb) TO authenticated;

-- 5. Claim RPC (called by background worker via service role only)
CREATE OR REPLACE FUNCTION public.claim_automation_jobs(_limit int DEFAULT 10)
RETURNS SETOF public.automation_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id
    FROM public.automation_jobs
    WHERE status = 'pending'
      AND next_run_at <= now()
    ORDER BY next_run_at ASC
    LIMIT LEAST(GREATEST(_limit, 1), 50)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.automation_jobs aj
  SET status = 'running',
      attempts = aj.attempts + 1,
      started_at = now(),
      updated_at = now()
  FROM picked
  WHERE aj.id = picked.id
  RETURNING aj.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_automation_jobs(int) FROM PUBLIC, authenticated, anon;

-- 6. Complete RPC (worker marks success / retry / dead)
CREATE OR REPLACE FUNCTION public.complete_automation_job(
  _job_id uuid,
  _success boolean,
  _error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.automation_jobs;
  _delay_seconds int;
BEGIN
  SELECT * INTO _job FROM public.automation_jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF _success THEN
    UPDATE public.automation_jobs
    SET status = 'done', finished_at = now(), updated_at = now(), last_error = NULL
    WHERE id = _job_id;
    RETURN;
  END IF;

  IF _job.attempts >= _job.max_attempts THEN
    UPDATE public.automation_jobs
    SET status = 'dead', finished_at = now(), updated_at = now(), last_error = _error
    WHERE id = _job_id;
    RETURN;
  END IF;

  -- Exponential backoff: 1m, 5m, 15m, 60m, 4h
  _delay_seconds := CASE _job.attempts
    WHEN 1 THEN 60
    WHEN 2 THEN 300
    WHEN 3 THEN 900
    WHEN 4 THEN 3600
    ELSE 14400
  END;

  UPDATE public.automation_jobs
  SET status = 'pending',
      next_run_at = now() + (_delay_seconds || ' seconds')::interval,
      last_error = _error,
      updated_at = now()
  WHERE id = _job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_automation_job(uuid, boolean, text) FROM PUBLIC, authenticated, anon;

-- 7. updated_at trigger
DROP TRIGGER IF EXISTS update_automation_jobs_updated_at ON public.automation_jobs;
CREATE TRIGGER update_automation_jobs_updated_at
  BEFORE UPDATE ON public.automation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();