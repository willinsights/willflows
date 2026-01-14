-- Table for promo codes (like flow30)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  trial_days INTEGER NOT NULL DEFAULT 30,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Public can read active promo codes (to validate)
CREATE POLICY "Anyone can read active promo codes" 
ON public.promo_codes 
FOR SELECT 
USING (is_active = true);

-- Only service role can manage promo codes
CREATE POLICY "Service role can manage promo codes" 
ON public.promo_codes 
FOR ALL 
USING (public.is_service_role());

-- Insert the flow30 promo code (30 days free)
INSERT INTO public.promo_codes (code, trial_days, max_uses, is_active)
VALUES ('flow30', 30, NULL, true);

-- Create trigger function to auto-create trial subscription when user is created
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create if user doesn't already have a subscription
  IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_subscriptions (
      user_id,
      subscription_plan,
      subscription_status,
      trial_ends_at
    ) VALUES (
      NEW.id,
      'essencial',
      'trialing',
      NOW() + INTERVAL '7 days'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (fires after new user profile is created)
DROP TRIGGER IF EXISTS on_user_created_trial ON public.profiles;
CREATE TRIGGER on_user_created_trial
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_trial_subscription();