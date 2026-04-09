
-- 1. Remove overly permissive storage policy for feedback screenshots
DROP POLICY IF EXISTS "Public read access for feedback screenshots" ON storage.objects;

-- 2. Remove overly broad push notification queue policy
DROP POLICY IF EXISTS "Service role can manage push queue" ON public.push_notification_queue;

-- 3. Replace hardcoded email policies on feedback table
DROP POLICY IF EXISTS "Only admins can delete feedback" ON public.feedback;
CREATE POLICY "Only admins can delete feedback" ON public.feedback
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

DROP POLICY IF EXISTS "Users can update own feedback or admins update all" ON public.feedback;
CREATE POLICY "Users can update own feedback or admins update all" ON public.feedback
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS "Users can view own feedback or admins view all" ON public.feedback;
CREATE POLICY "Users can view own feedback or admins view all" ON public.feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());

-- 4. Replace hardcoded email policy on beta_invite_tokens
DROP POLICY IF EXISTS "Only system admins can insert invite tokens" ON public.beta_invite_tokens;
CREATE POLICY "Only system admins can insert invite tokens" ON public.beta_invite_tokens
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());
