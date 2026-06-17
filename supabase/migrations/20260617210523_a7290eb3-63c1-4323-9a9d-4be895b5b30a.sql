CREATE OR REPLACE FUNCTION public.sync_project_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project_id uuid;
  v_new_status text;
  v_new_paid_at timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_project_id := NEW.project_id;
  IF v_project_id IS NULL THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'paga' THEN
      v_new_status := 'pago';
      v_new_paid_at := COALESCE(NEW.paid_at, now());
    WHEN 'vencida' THEN
      v_new_status := 'vencido';
      v_new_paid_at := NULL;
    WHEN 'emitida', 'rascunho' THEN
      v_new_status := 'pendente';
      v_new_paid_at := NULL;
    WHEN 'cancelada' THEN
      RETURN NEW;
    ELSE
      RETURN NEW;
  END CASE;

  UPDATE public.projects
  SET
    client_payment_status = v_new_status,
    client_paid_at = v_new_paid_at,
    updated_at = now()
  WHERE id = v_project_id
    AND (client_payment_status IS DISTINCT FROM v_new_status
         OR client_paid_at IS DISTINCT FROM v_new_paid_at);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_sync_project ON public.invoices;
CREATE TRIGGER trg_invoice_sync_project
  AFTER INSERT OR UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_payment_status();

-- Backfill: re-trigger for all existing invoices
UPDATE public.invoices SET status = status WHERE project_id IS NOT NULL;