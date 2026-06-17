
-- 1. Tabela webhook_inbox
CREATE TABLE public.webhook_inbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL,
  event_id        text NOT NULL,
  event_type      text,
  payload         jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'pending', -- pending | processing | processed | failed | dead
  attempts        int  NOT NULL DEFAULT 0,
  max_attempts    int  NOT NULL DEFAULT 5,
  next_retry_at   timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  locked_at       timestamptz,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

-- 2. GRANTS
GRANT SELECT ON public.webhook_inbox TO authenticated;
GRANT ALL ON public.webhook_inbox TO service_role;

-- 3. Indexes
CREATE INDEX idx_webhook_inbox_pending ON public.webhook_inbox (status, next_retry_at) WHERE status IN ('pending','failed');
CREATE INDEX idx_webhook_inbox_provider ON public.webhook_inbox (provider, created_at DESC);

-- 4. RLS
ALTER TABLE public.webhook_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_select_webhook_inbox" ON public.webhook_inbox
  FOR SELECT TO authenticated USING (public.is_system_admin());

CREATE POLICY "service_role_all_webhook_inbox" ON public.webhook_inbox
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Trigger updated_at
CREATE TRIGGER trg_webhook_inbox_updated_at
  BEFORE UPDATE ON public.webhook_inbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RPC: reclamar lote de eventos para processar (com lock by locked_at)
CREATE OR REPLACE FUNCTION public.webhook_inbox_claim_batch(p_limit int DEFAULT 10)
RETURNS SETOF public.webhook_inbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.webhook_inbox w
  SET status = 'processing',
      locked_at = now(),
      attempts = w.attempts + 1,
      updated_at = now()
  WHERE w.id IN (
    SELECT id FROM public.webhook_inbox
    WHERE status IN ('pending','failed')
      AND next_retry_at <= now()
      AND attempts < max_attempts
    ORDER BY next_retry_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- 7. RPC: marcar como processado
CREATE OR REPLACE FUNCTION public.webhook_inbox_mark_processed(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.webhook_inbox
  SET status='processed', processed_at=now(), last_error=NULL, locked_at=NULL, updated_at=now()
  WHERE id = p_id;
$$;

-- 8. RPC: marcar como falhado (calcula next_retry_at com backoff exponencial)
CREATE OR REPLACE FUNCTION public.webhook_inbox_mark_failed(p_id uuid, p_error text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts int;
  v_max int;
  v_delay interval;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max FROM public.webhook_inbox WHERE id = p_id;

  -- Backoff: 1m, 5m, 30m, 2h, 12h
  v_delay := CASE v_attempts
    WHEN 1 THEN interval '1 minute'
    WHEN 2 THEN interval '5 minutes'
    WHEN 3 THEN interval '30 minutes'
    WHEN 4 THEN interval '2 hours'
    ELSE interval '12 hours'
  END;

  UPDATE public.webhook_inbox
  SET status = CASE WHEN v_attempts >= v_max THEN 'dead' ELSE 'failed' END,
      last_error = p_error,
      next_retry_at = now() + v_delay,
      locked_at = NULL,
      updated_at = now()
  WHERE id = p_id;
END;
$$;

-- 9. RPC admin: forçar retry agora
CREATE OR REPLACE FUNCTION public.webhook_inbox_retry_now(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin required';
  END IF;
  UPDATE public.webhook_inbox
  SET status='pending', next_retry_at=now(), last_error=NULL, locked_at=NULL, updated_at=now()
  WHERE id = p_id;
END;
$$;

-- 10. RPC admin: marcar como resolvido manualmente
CREATE OR REPLACE FUNCTION public.webhook_inbox_resolve(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin required';
  END IF;
  UPDATE public.webhook_inbox
  SET status='processed', processed_at=now(), locked_at=NULL, updated_at=now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.webhook_inbox_retry_now(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.webhook_inbox_resolve(uuid) TO authenticated;
