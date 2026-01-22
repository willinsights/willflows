-- STEP 1: Add columns first
ALTER TABLE public.workspace_invitations 
ADD COLUMN IF NOT EXISTS email_hash text,
ADD COLUMN IF NOT EXISTS email_masked text;

-- STEP 2: Create helper functions
CREATE OR REPLACE FUNCTION public.mask_email(_email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  local_part text;
  domain_part text;
  masked_local text;
  local_len int;
BEGIN
  IF _email IS NULL OR _email = '' THEN
    RETURN NULL;
  END IF;
  
  local_part := split_part(lower(_email), '@', 1);
  domain_part := split_part(lower(_email), '@', 2);
  local_len := length(local_part);
  
  IF local_len <= 2 THEN
    masked_local := local_part;
  ELSIF local_len <= 4 THEN
    masked_local := substring(local_part, 1, 1) || '***' || substring(local_part, local_len, 1);
  ELSE
    masked_local := substring(local_part, 1, 2) || '***' || substring(local_part, local_len - 1, 2);
  END IF;
  
  RETURN masked_local || '@' || domain_part;
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT encode(extensions.digest(lower(trim(_email))::bytea, 'sha256'), 'hex');
$$;

-- STEP 3: Create trigger to auto-set hash and mask
CREATE OR REPLACE FUNCTION public.set_invitation_email_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND (OLD IS NULL OR NEW.email != OLD.email OR NEW.email_hash IS NULL) THEN
    NEW.email_hash := public.hash_email(NEW.email);
    NEW.email_masked := public.mask_email(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invitation_email_security_trigger ON public.workspace_invitations;
CREATE TRIGGER set_invitation_email_security_trigger
BEFORE INSERT OR UPDATE ON public.workspace_invitations
FOR EACH ROW
EXECUTE FUNCTION public.set_invitation_email_security();

-- STEP 4: Migrate existing data
UPDATE public.workspace_invitations
SET 
  email_hash = public.hash_email(email),
  email_masked = public.mask_email(email)
WHERE email_hash IS NULL OR email_masked IS NULL;

-- STEP 5: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email_hash 
ON public.workspace_invitations(email_hash);