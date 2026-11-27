CREATE OR REPLACE FUNCTION public.guard_payments_self_pay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.collaborator_id IS DISTINCT FROM auth.uid()
     OR COALESCE(NEW.is_receivable, false) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.amount IS NOT DISTINCT FROM OLD.amount
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.paid_at IS NOT DISTINCT FROM OLD.paid_at
     AND NEW.collaborator_id IS NOT DISTINCT FROM OLD.collaborator_id
     AND NEW.is_receivable IS NOT DISTINCT FROM OLD.is_receivable THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Not allowed to record or settle your own payment' USING ERRCODE = '42501';
END $$;
DROP TRIGGER IF EXISTS trg_guard_payments_self_pay ON public.payments;
CREATE TRIGGER trg_guard_payments_self_pay BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.guard_payments_self_pay();