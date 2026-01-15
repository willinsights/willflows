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
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- NOVA VERIFICACAO: Confirmar que o utilizador existe em auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sessão inválida. Por favor, faça logout e entre novamente.');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Find and validate the invitation
  SELECT wi.*, w.name as workspace_name
  INTO v_invitation
  FROM workspace_invitations wi
  JOIN workspaces w ON w.id = wi.workspace_id
  WHERE wi.token = p_token
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
    'workspace_name', v_invitation.workspace_name,
    'role', v_invitation.role
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;