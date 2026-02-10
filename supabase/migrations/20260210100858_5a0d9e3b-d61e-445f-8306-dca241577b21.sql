
-- Add paid_at to project_team for cashflow tracking
ALTER TABLE public.project_team ADD COLUMN paid_at timestamptz;

-- Add custos_extras_paid_at to projects for cashflow tracking
ALTER TABLE public.projects ADD COLUMN custos_extras_paid_at timestamptz;

-- Trigger function: auto-set/clear paid_at on project_team when payment_status changes
CREATE OR REPLACE FUNCTION public.handle_project_team_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'pago' AND (OLD.payment_status IS DISTINCT FROM 'pago') THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  ELSIF NEW.payment_status IS DISTINCT FROM 'pago' AND (OLD.payment_status = 'pago') THEN
    NEW.paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_project_team_paid_at
  BEFORE UPDATE ON public.project_team
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_project_team_paid_at();

-- Trigger function: auto-set/clear custos_extras_paid_at on projects
CREATE OR REPLACE FUNCTION public.handle_custos_extras_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.custos_extras_payment_status = 'pago' AND (OLD.custos_extras_payment_status IS DISTINCT FROM 'pago') THEN
    NEW.custos_extras_paid_at := COALESCE(NEW.custos_extras_paid_at, now());
  ELSIF NEW.custos_extras_payment_status IS DISTINCT FROM 'pago' AND (OLD.custos_extras_payment_status = 'pago') THEN
    NEW.custos_extras_paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_custos_extras_paid_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_custos_extras_paid_at();

-- Trigger function: ensure client_paid_at consistency
CREATE OR REPLACE FUNCTION public.handle_client_paid_at_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_payment_status = 'pago' AND (OLD.client_payment_status IS DISTINCT FROM 'pago') THEN
    NEW.client_paid_at := COALESCE(NEW.client_paid_at, now());
  ELSIF NEW.client_payment_status IS DISTINCT FROM 'pago' AND (OLD.client_payment_status = 'pago') THEN
    NEW.client_paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_client_paid_at_consistency
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_client_paid_at_consistency();

-- Backfill: set paid_at for already-paid project_team members
UPDATE public.project_team SET paid_at = created_at WHERE payment_status = 'pago' AND paid_at IS NULL;

-- Backfill: set custos_extras_paid_at for already-paid projects
UPDATE public.projects SET custos_extras_paid_at = delivered_at WHERE custos_extras_payment_status = 'pago' AND custos_extras_paid_at IS NULL AND delivered_at IS NOT NULL;
UPDATE public.projects SET custos_extras_paid_at = created_at WHERE custos_extras_payment_status = 'pago' AND custos_extras_paid_at IS NULL;
