-- ============================================
-- Fix: Workspace Members Self-Insert Bypass Vulnerability
-- ============================================

-- 1. Drop the insecure INSERT policy that allows anyone to insert themselves
DROP POLICY IF EXISTS "Users can insert themselves as members" ON public.workspace_members;

-- 2. Create a secure RPC function to accept workspace invitations
-- This function validates the invitation before allowing member creation
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Find the invitation by token
  SELECT wi.id, wi.email, wi.role, wi.workspace_id, wi.expires_at, wi.accepted_at
  INTO v_invitation
  FROM workspace_invitations wi
  WHERE wi.token = p_token;

  -- Check if invitation exists
  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Check if invitation has expired
  IF v_invitation.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Check if invitation was already accepted
  IF v_invitation.accepted_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation already accepted');
  END IF;

  -- Check if user email matches invitation email (case insensitive)
  IF lower(v_user_email) != lower(v_invitation.email) THEN
    RETURN json_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;

  -- Check if user is already a member of this workspace
  SELECT id INTO v_existing_member
  FROM workspace_members
  WHERE workspace_id = v_invitation.workspace_id
    AND user_id = v_user_id
    AND is_active = true;

  IF v_existing_member IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User is already a member of this workspace');
  END IF;

  -- All validations passed - create the workspace member
  INSERT INTO workspace_members (
    workspace_id,
    user_id,
    role,
    joined_at,
    is_active
  ) VALUES (
    v_invitation.workspace_id,
    v_user_id,
    v_invitation.role,
    now(),
    true
  )
  RETURNING id INTO v_new_member_id;

  -- Mark the invitation as accepted
  UPDATE workspace_invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true, 
    'member_id', v_new_member_id,
    'workspace_id', v_invitation.workspace_id,
    'role', v_invitation.role
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(text) TO authenticated;

-- 3. Ensure admins can still manage members through the existing policy
-- The "Admins can manage workspace members" policy already exists and handles admin operations