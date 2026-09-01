CREATE TABLE IF NOT EXISTS public.public_access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.public_access_attempts TO service_role;

ALTER TABLE public.public_access_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages public access attempts"
ON public.public_access_attempts FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

CREATE INDEX IF NOT EXISTS idx_public_access_attempts_lookup
ON public.public_access_attempts (identifier, action, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_public_rate_limit(
  _identifier text,
  _action text,
  _max_failures integer DEFAULT 10,
  _window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failures integer;
BEGIN
  DELETE FROM public.public_access_attempts
  WHERE created_at < now() - interval '1 day';

  SELECT count(*) INTO failures
  FROM public.public_access_attempts
  WHERE identifier = _identifier
    AND action = _action
    AND succeeded = false
    AND created_at > now() - (_window_minutes || ' minutes')::interval;

  RETURN failures < _max_failures;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_public_access_attempt(
  _identifier text,
  _action text,
  _succeeded boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_access_attempts (identifier, action, succeeded)
  VALUES (_identifier, _action, _succeeded);
END;
$$;

REVOKE ALL ON FUNCTION public.check_public_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_public_access_attempt(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_public_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_public_access_attempt(text, text, boolean) TO service_role;