-- Tighten overly permissive policy on beta_waitlist inserts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='beta_waitlist' AND policyname='Anyone can join waitlist'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can join waitlist" ON public.beta_waitlist';
  END IF;
END $$;

CREATE POLICY "Anyone can join waitlist"
ON public.beta_waitlist
FOR INSERT
WITH CHECK (
  email IS NOT NULL
  AND length(trim(email)) > 3
  AND position('@' in email) > 1
  AND position('.' in email) > position('@' in email)
);
