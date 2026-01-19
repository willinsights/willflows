-- Security fix: Hash workspace invitation tokens to prevent interception
-- This migration adds token hashing using pgcrypto extension from extensions schema

-- Add a column to store the hashed token
-- The original token column will still exist for backwards compatibility during migration
ALTER TABLE public.workspace_invitations 
ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Create index on token_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token_hash 
ON public.workspace_invitations(token_hash);

-- Create a function to hash tokens using SHA-256
-- Note: pgcrypto is in extensions schema for Supabase
CREATE OR REPLACE FUNCTION public.hash_invitation_token(_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT encode(extensions.digest(_token::bytea, 'sha256'), 'hex');
$$;

-- Update existing invitations to have token_hash
-- Note: We hash the existing tokens so lookups still work
UPDATE public.workspace_invitations 
SET token_hash = public.hash_invitation_token(token)
WHERE token_hash IS NULL AND token IS NOT NULL;

-- Update get_invitation_by_token to use token_hash for comparison
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  workspace_name text,
  email text,
  role app_role,
  expires_at timestamptz,
  accepted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wi.id,
    wi.workspace_id,
    w.name as workspace_name,
    wi.email,
    wi.role,
    wi.expires_at,
    wi.accepted_at
  FROM workspace_invitations wi
  JOIN workspaces w ON w.id = wi.workspace_id
  WHERE wi.token_hash = public.hash_invitation_token(_token)
    AND wi.accepted_at IS NULL
    AND wi.expires_at > now();
$$;

-- Update accept_workspace_invitation to use token_hash for comparison
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id uuid;
  v_user_email text;
  v_existing_member uuid;
  v_new_member_id uuid;
  v_token_hash text;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Verify user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sessão inválida. Por favor, faça logout e entre novamente.');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Hash the provided token for secure comparison
  v_token_hash := public.hash_invitation_token(p_token);

  -- Find and validate the invitation using token hash
  SELECT wi.*, w.name as workspace_name
  INTO v_invitation
  FROM workspace_invitations wi
  JOIN workspaces w ON w.id = wi.workspace_id
  WHERE wi.token_hash = v_token_hash
  AND wi.accepted_at IS NULL
  AND wi.expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  -- Verify email matches (case insensitive)
  IF lower(v_invitation.email) != lower(v_user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Este convite foi enviado para outro email');
  END IF;

  -- Check if user is already a member
  SELECT id INTO v_existing_member
  FROM workspace_members
  WHERE workspace_id = v_invitation.workspace_id
  AND user_id = v_user_id;

  IF v_existing_member IS NOT NULL THEN
    -- Mark invitation as accepted anyway
    UPDATE workspace_invitations
    SET accepted_at = now()
    WHERE id = v_invitation.id;
    
    RETURN json_build_object('success', true, 'message', 'Já és membro deste workspace', 'workspace_id', v_invitation.workspace_id);
  END IF;

  -- Create the workspace member
  INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, is_active)
  VALUES (v_invitation.workspace_id, v_user_id, v_invitation.role, now(), true)
  RETURNING id INTO v_new_member_id;

  -- Mark invitation as accepted
  UPDATE workspace_invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Convite aceite com sucesso',
    'workspace_id', v_invitation.workspace_id,
    'role', v_invitation.role::text
  );
END;
$$;

-- Create a trigger to automatically hash tokens on insert/update
CREATE OR REPLACE FUNCTION public.hash_invitation_token_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hash the token whenever it's set or changed
  IF NEW.token IS NOT NULL AND (OLD IS NULL OR NEW.token != OLD.token OR NEW.token_hash IS NULL) THEN
    NEW.token_hash := public.hash_invitation_token(NEW.token);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic token hashing
DROP TRIGGER IF EXISTS hash_invitation_token_on_change ON public.workspace_invitations;
CREATE TRIGGER hash_invitation_token_on_change
  BEFORE INSERT OR UPDATE ON public.workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_invitation_token_trigger();