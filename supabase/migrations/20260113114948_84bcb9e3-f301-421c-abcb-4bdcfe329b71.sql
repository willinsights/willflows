-- 1. Remove permissive policy that exposes all tokens
DROP POLICY IF EXISTS "Verify token by value" ON public.beta_invite_tokens;

-- 2. Create secure function to verify tokens without exposing the table
CREATE OR REPLACE FUNCTION public.verify_beta_token(_token text)
RETURNS TABLE (
  id uuid, 
  email text, 
  expires_at timestamptz, 
  used_by uuid,
  used_at timestamptz,
  is_valid boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bit.id, 
    bit.email, 
    bit.expires_at,
    bit.used_by,
    bit.used_at,
    (bit.used_by IS NULL AND (bit.expires_at IS NULL OR bit.expires_at > now())) as is_valid
  FROM public.beta_invite_tokens bit
  WHERE bit.token = _token
  LIMIT 1;
$$;

-- 3. Create policy that only allows admins to view all tokens
CREATE POLICY "Only admins can view all tokens"
ON public.beta_invite_tokens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() 
      AND wm.role = 'admin' 
      AND wm.is_active = true
  )
);

-- 4. Strengthen can_view_profile to require authentication
CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() IS NOT NULL
    AND (
      -- User can view their own profile
      _profile_id = auth.uid()
      OR
      -- User can view profiles of members in their workspaces
      EXISTS (
        SELECT 1
        FROM workspace_members wm1
        JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
        WHERE wm1.user_id = auth.uid()
          AND wm2.user_id = _profile_id
          AND wm1.is_active = true
          AND wm2.is_active = true
      )
    )
$$;