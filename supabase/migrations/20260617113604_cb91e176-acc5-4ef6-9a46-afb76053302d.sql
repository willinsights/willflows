CREATE TABLE IF NOT EXISTS public.subscription_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid,
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_status text,
  db_status text,
  discrepancy_type text NOT NULL DEFAULT 'status_mismatch',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_discrepancies_unresolved
  ON public.subscription_discrepancies (detected_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_discrepancies_workspace
  ON public.subscription_discrepancies (workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscription_discrepancies_stripe_sub
  ON public.subscription_discrepancies (stripe_subscription_id);

GRANT SELECT, INSERT, UPDATE ON public.subscription_discrepancies TO authenticated;
GRANT ALL ON public.subscription_discrepancies TO service_role;

ALTER TABLE public.subscription_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read discrepancies"
  ON public.subscription_discrepancies FOR SELECT
  TO authenticated
  USING (public.is_system_admin());

CREATE POLICY "Super admins update discrepancies"
  ON public.subscription_discrepancies FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY "Super admins insert discrepancies"
  ON public.subscription_discrepancies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY "Service role manages discrepancies"
  ON public.subscription_discrepancies FOR ALL
  TO authenticated
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

CREATE OR REPLACE FUNCTION public.touch_subscription_discrepancies()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_subscription_discrepancies ON public.subscription_discrepancies;
CREATE TRIGGER trg_touch_subscription_discrepancies
BEFORE UPDATE ON public.subscription_discrepancies
FOR EACH ROW EXECUTE FUNCTION public.touch_subscription_discrepancies();