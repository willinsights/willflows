CREATE OR REPLACE FUNCTION public.sync_invoice_paid_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paga' AND NEW.paid_at IS NULL THEN
    NEW.paid_at := now();
  ELSIF NEW.status <> 'paga' THEN
    NEW.paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_paid_at ON public.invoices;
CREATE TRIGGER trg_invoice_paid_at
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_paid_at();

UPDATE public.invoices
SET paid_at = updated_at
WHERE status = 'paga' AND paid_at IS NULL;