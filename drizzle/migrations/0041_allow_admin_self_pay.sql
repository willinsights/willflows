CREATE OR REPLACE FUNCTION public.guard_project_team_self_pay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RETURN NEW; END IF;
  IF public.is_workspace_admin(auth.uid(), COALESCE(NEW.workspace_id, (SELECT workspace_id FROM public.projects WHERE id = NEW.project_id))) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.payment_amount IS NOT DISTINCT FROM OLD.payment_amount
     AND NEW.cost_amount IS NOT DISTINCT FROM OLD.cost_amount THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.payment_amount IS NULL AND NEW.cost_amount IS NULL THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Not allowed to set your own pay' USING ERRCODE = '42501';
END $$;
CREATE OR REPLACE FUNCTION public.guard_payments_self_pay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.collaborator_id IS DISTINCT FROM auth.uid()
     OR COALESCE(NEW.is_receivable, false) THEN RETURN NEW; END IF;
  IF public.is_workspace_admin(auth.uid(), NEW.workspace_id) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.amount IS NOT DISTINCT FROM OLD.amount
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.paid_at IS NOT DISTINCT FROM OLD.paid_at
     AND NEW.collaborator_id IS NOT DISTINCT FROM OLD.collaborator_id
     AND NEW.is_receivable IS NOT DISTINCT FROM OLD.is_receivable THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Not allowed to record or settle your own payment' USING ERRCODE = '42501';
END $$;