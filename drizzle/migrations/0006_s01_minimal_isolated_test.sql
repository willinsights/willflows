CREATE OR REPLACE FUNCTION public.is_service_role() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(auth.role(), '') = 'service_role'
      OR COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'service_role'
      OR (
        session_user = 'postgres'
        AND COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb = '{}'::jsonb
        AND COALESCE(current_setting('request.jwt.claim.role', true), '') = ''
        AND COALESCE(current_setting('role', true), 'none') IN ('none', 'postgres')
      );
$$;
REVOKE EXECUTE ON FUNCTION public.is_service_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_service_role() TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Service role manages redemptions" ON public.promo_code_redemptions;
CREATE POLICY "Service role manages redemptions" ON public.promo_code_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage promo codes" ON public.promo_codes;
CREATE POLICY "Service role can manage promo codes" ON public.promo_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service role manages public access attempts" ON public.public_access_attempts;
CREATE POLICY "service role manages public access attempts" ON public.public_access_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access to push queue" ON public.push_notification_queue;
CREATE POLICY "Service role full access to push queue" ON public.push_notification_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage webhook logs" ON public.stripe_webhook_log;
CREATE POLICY "Service role can manage webhook logs" ON public.stripe_webhook_log FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages discrepancies" ON public.subscription_discrepancies;
CREATE POLICY "Service role manages discrepancies" ON public.subscription_discrepancies FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON public.subscription_invoices;
CREATE POLICY "Service role full access" ON public.subscription_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage system_admins" ON public.system_admins;
CREATE POLICY "Service role can manage system_admins" ON public.system_admins FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.user_subscriptions;
CREATE POLICY "Service role manages subscriptions" ON public.user_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage approval tokens" ON public.video_approval_tokens;
CREATE POLICY "Service role can manage approval tokens" ON public.video_approval_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage video approvals" ON public.video_approvals;
CREATE POLICY "Service role can manage video approvals" ON public.video_approvals FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage video comments" ON public.video_comments;
CREATE POLICY "Service role can manage video comments" ON public.video_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage video versions" ON public.video_versions;
CREATE POLICY "Service role can manage video versions" ON public.video_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage video storage" ON storage.objects;
CREATE POLICY "Service role can manage video storage" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'video-versions') WITH CHECK (bucket_id = 'video-versions');
DROP POLICY IF EXISTS "System admins can view all invoices" ON public.subscription_invoices;
CREATE POLICY "System admins can view all invoices" ON public.subscription_invoices FOR SELECT TO authenticated USING (public.is_system_admin(auth.uid()));