-- Drop existing functions with different signatures
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);
DROP FUNCTION IF EXISTS public.verify_invitation_token(text);

-- Recreate get_invitation_by_token with email_masked
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(id uuid, workspace_id uuid, workspace_name text, email text, email_masked text, role app_role, expires_at timestamp with time zone, accepted_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    wi.id,
    wi.workspace_id,
    w.name as workspace_name,
    wi.email,
    wi.email_masked,
    wi.role,
    wi.expires_at,
    wi.accepted_at
  FROM workspace_invitations wi
  JOIN workspaces w ON w.id = wi.workspace_id
  WHERE wi.token_hash = public.hash_invitation_token(_token)
    AND wi.accepted_at IS NULL
    AND wi.expires_at > now();
$$;

-- Recreate verify_invitation_token with email_masked
CREATE OR REPLACE FUNCTION public.verify_invitation_token(_token text)
RETURNS TABLE(id uuid, email text, email_masked text, role app_role, workspace_id uuid, workspace_name text, expires_at timestamp with time zone, accepted_at timestamp with time zone, is_valid boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    wi.id,
    wi.email,
    wi.email_masked,
    wi.role,
    wi.workspace_id,
    w.name as workspace_name,
    wi.expires_at,
    wi.accepted_at,
    (wi.accepted_at IS NULL AND wi.expires_at > now()) as is_valid
  FROM public.workspace_invitations wi
  JOIN public.workspaces w ON w.id = wi.workspace_id
  WHERE wi.token = _token
  LIMIT 1;
$$;

-- Update accept_workspace_invitation to use email_hash comparison
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
  v_user_email_hash text;
  v_existing_member uuid;
  v_new_member_id uuid;
  v_token_hash text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sessão inválida. Por favor, faça logout e entre novamente.');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  v_user_email_hash := public.hash_email(v_user_email);
  v_token_hash := public.hash_invitation_token(p_token);

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

  -- Secure hash comparison (case-insensitive, no manipulation possible)
  IF v_invitation.email_hash != v_user_email_hash THEN
    RETURN json_build_object('success', false, 'error', 'Este convite foi enviado para outro email');
  END IF;

  SELECT id INTO v_existing_member
  FROM workspace_members
  WHERE workspace_id = v_invitation.workspace_id AND user_id = v_user_id;

  IF v_existing_member IS NOT NULL THEN
    UPDATE workspace_invitations SET accepted_at = now() WHERE id = v_invitation.id;
    RETURN json_build_object('success', true, 'message', 'Já és membro deste workspace', 'workspace_id', v_invitation.workspace_id);
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, is_active)
  VALUES (v_invitation.workspace_id, v_user_id, v_invitation.role, now(), true)
  RETURNING id INTO v_new_member_id;

  UPDATE workspace_invitations SET accepted_at = now() WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Convite aceite com sucesso',
    'workspace_id', v_invitation.workspace_id,
    'role', v_invitation.role::text
  );
END;
$$;

-- Update RLS policy to use email_hash for secure matching
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations securely" ON public.workspace_invitations;

CREATE POLICY "Users can view their own invitations securely"
ON public.workspace_invitations
FOR SELECT
USING (
  auth.email() IS NOT NULL 
  AND email_hash = public.hash_email(auth.email())
);