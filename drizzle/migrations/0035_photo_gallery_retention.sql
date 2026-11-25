ALTER TABLE public.photo_galleries
 ADD COLUMN delete_after_download boolean NOT NULL DEFAULT false,
 ADD COLUMN delete_at timestamptz,
 ADD COLUMN download_requested_at timestamptz,
 ADD COLUMN download_confirmed_at timestamptz,
 ADD COLUMN cleanup_started_at timestamptz,
 ADD COLUMN cleanup_after timestamptz,
 ADD COLUMN last_upload_expires_at timestamptz;
CREATE INDEX photo_gallery_cleanup_due ON public.photo_galleries(cleanup_after) WHERE cleanup_started_at IS NOT NULL;
REVOKE DELETE ON public.photo_galleries FROM authenticated;

CREATE OR REPLACE FUNCTION public.guard_gallery_retention() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  IF TG_OP = 'INSERT' THEN
   IF NEW.cleanup_started_at IS NOT NULL OR NEW.cleanup_after IS NOT NULL OR NEW.download_requested_at IS NOT NULL OR NEW.download_confirmed_at IS NOT NULL OR NEW.last_upload_expires_at IS NOT NULL THEN RAISE EXCEPTION 'Server-owned retention fields'; END IF;
  ELSE
   IF OLD.cleanup_started_at IS NOT NULL THEN RAISE EXCEPTION 'Gallery deletion already requested'; END IF;
   IF NEW.cleanup_started_at IS DISTINCT FROM OLD.cleanup_started_at OR NEW.cleanup_after IS DISTINCT FROM OLD.cleanup_after OR NEW.download_requested_at IS DISTINCT FROM OLD.download_requested_at OR NEW.download_confirmed_at IS DISTINCT FROM OLD.download_confirmed_at OR NEW.last_upload_expires_at IS DISTINCT FROM OLD.last_upload_expires_at THEN RAISE EXCEPTION 'Server-owned retention fields'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_gallery_retention BEFORE INSERT OR UPDATE ON public.photo_galleries FOR EACH ROW EXECUTE FUNCTION public.guard_gallery_retention();

CREATE OR REPLACE FUNCTION public.guard_retiring_gallery_photos() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE retired timestamptz;
BEGIN
 SELECT cleanup_started_at INTO retired FROM public.photo_galleries WHERE id=NEW.gallery_id FOR UPDATE;
 IF retired IS NOT NULL THEN RAISE EXCEPTION 'Gallery deletion already requested'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_retiring_gallery_photos BEFORE INSERT OR UPDATE ON public.gallery_photos FOR EACH ROW EXECUTE FUNCTION public.guard_retiring_gallery_photos();

CREATE OR REPLACE FUNCTION public.queue_gallery_cleanup(p_gallery_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.photo_galleries SET cleanup_started_at=now(), cleanup_after=GREATEST(now()+interval '1 hour',COALESCE(last_upload_expires_at,now())+interval '5 minutes')
 WHERE id=p_gallery_id AND cleanup_started_at IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.queue_gallery_cleanup(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_gallery_cleanup(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_gallery_upload(p_gallery_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.photo_galleries SET last_upload_expires_at=now()+interval '15 minutes'
 WHERE id=p_gallery_id AND cleanup_started_at IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.reserve_gallery_upload(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_gallery_upload(uuid) TO service_role;