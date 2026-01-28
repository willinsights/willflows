-- =====================================================
-- FIX 1: project_templates_public - Restrict template access
-- =====================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Users can view templates in their workspace" ON public.project_templates;

-- Create restrictive policy - require authentication and workspace membership
CREATE POLICY "Members can view templates in their workspace"
ON public.project_templates FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- User's own workspace templates
    is_workspace_member(auth.uid(), workspace_id)
    -- OR system default templates (workspace_id IS NULL) but only for authenticated users
    OR (workspace_id IS NULL AND auth.uid() IS NOT NULL)
  )
);

-- =====================================================
-- FIX 2: promo_multi_use - Add promo code redemption tracking
-- =====================================================

-- Create promo_code_redemptions table to track per-user usage
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);

-- Enable RLS
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Only service role and system admins can manage redemptions
CREATE POLICY "Service role manages redemptions"
ON public.promo_code_redemptions FOR ALL
USING (is_service_role())
WITH CHECK (is_service_role());

CREATE POLICY "System admins can view redemptions"
ON public.promo_code_redemptions FOR SELECT
USING (is_system_admin());

-- Update validate_promo_code function to check for prior redemptions
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_current_uses integer;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Find the promo code
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(code) = UPPER(_code)
    AND is_active = true;
  
  -- Check if code exists
  IF v_promo.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  
  -- Check if expired
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  
  -- Count current uses
  SELECT COUNT(*) INTO v_current_uses
  FROM promo_code_redemptions
  WHERE promo_code_id = v_promo.id;
  
  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'max_uses_reached');
  END IF;
  
  -- Check if user already redeemed this code
  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM promo_code_redemptions 
    WHERE promo_code_id = v_promo.id 
    AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_redeemed');
  END IF;
  
  -- Return valid promo details
  RETURN jsonb_build_object(
    'valid', true,
    'promo_id', v_promo.id,
    'code', v_promo.code,
    'discount_percent', v_promo.discount_percent,
    'discount_days', v_promo.discount_days,
    'stripe_coupon_id', v_promo.stripe_coupon_id
  );
END;
$$;

-- Create function to record promo redemption
CREATE OR REPLACE FUNCTION public.record_promo_redemption(_promo_code_id uuid, _workspace_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Insert redemption record (will fail if already exists due to unique constraint)
  INSERT INTO promo_code_redemptions (promo_code_id, user_id, workspace_id)
  VALUES (_promo_code_id, v_user_id, _workspace_id)
  ON CONFLICT (promo_code_id, user_id) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- =====================================================
-- FIX 3: blog_posts_draft_exposure - Strengthen draft protection
-- =====================================================

-- Drop existing public read policy if exists
DROP POLICY IF EXISTS "Anyone can read published posts" ON public.blog_posts;

-- Create explicit policy that only exposes published posts publicly
CREATE POLICY "Anyone can read published posts"
ON public.blog_posts FOR SELECT
USING (is_published = true);

-- Ensure system admins can view all posts (including drafts)
DROP POLICY IF EXISTS "System admins can view all posts" ON public.blog_posts;
CREATE POLICY "System admins can view all posts"
ON public.blog_posts FOR SELECT
USING (is_system_admin());