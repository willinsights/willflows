-- Fix overly permissive RLS policies on beta_invite_tokens table
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can create invite tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Authenticated users can update invite tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Authenticated users can delete invite tokens" ON public.beta_invite_tokens;

-- Keep the public SELECT for token verification (needed for signup flow)
-- The "Anyone can view invite tokens" policy should remain for token verification

-- Add admin-only policies for management operations
CREATE POLICY "Admins can insert beta invite tokens"
  ON public.beta_invite_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'admin'
        AND wm.is_active = true
    )
  );

CREATE POLICY "Admins can update beta invite tokens"
  ON public.beta_invite_tokens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'admin'
        AND wm.is_active = true
    )
  );

CREATE POLICY "Admins can delete beta invite tokens"
  ON public.beta_invite_tokens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'admin'
        AND wm.is_active = true
    )
  );

-- Fix overly permissive RLS policies on beta_waitlist table
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Authenticated users can update waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Authenticated users can delete from waitlist" ON public.beta_waitlist;

-- Keep the public INSERT policy for waitlist form submissions
-- The "Anyone can insert into waitlist" policy should remain

-- Add admin-only policies for SELECT, UPDATE, DELETE
CREATE POLICY "Admins can view beta waitlist"
  ON public.beta_waitlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'admin'
        AND wm.is_active = true
    )
  );

CREATE POLICY "Admins can update beta waitlist"
  ON public.beta_waitlist
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'admin'
        AND wm.is_active = true
    )
  );

CREATE POLICY "Admins can delete from beta waitlist"
  ON public.beta_waitlist
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'admin'
        AND wm.is_active = true
    )
  );