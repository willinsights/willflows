-- Standalone PRE-CUTOVER candidate. No production activation in this package.
BEGIN;
CREATE TABLE public.video_upload_maintenance (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  issuance_open boolean NOT NULL DEFAULT false,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT ALL ON public.video_upload_maintenance TO service_role;
REVOKE ALL ON public.video_upload_maintenance FROM PUBLIC, anon, authenticated;
ALTER TABLE public.video_upload_maintenance ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.video_upload_issuance_open() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT (current_setting('request.jwt.claims',true)::jsonb->>'role' = 'service_role') IS TRUE
    AND COALESCE((SELECT issuance_open FROM public.video_upload_maintenance WHERE singleton),false);
$$;
REVOKE ALL ON FUNCTION public.video_upload_issuance_open() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.video_upload_issuance_open() TO service_role;
COMMIT;