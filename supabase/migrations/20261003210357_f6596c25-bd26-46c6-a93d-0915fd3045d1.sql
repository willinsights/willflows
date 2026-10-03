CREATE TABLE public.closed_months (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month date NOT NULL,
  closed_by uuid,
  closed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, month)
);
GRANT SELECT, INSERT, DELETE ON public.closed_months TO authenticated;
GRANT ALL ON public.closed_months TO service_role;
ALTER TABLE public.closed_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view closed months" ON public.closed_months FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins close months" ON public.closed_months FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) AND closed_by = auth.uid());
CREATE POLICY "Admins reopen months" ON public.closed_months FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE OR REPLACE FUNCTION public.is_month_closed(_workspace_id uuid, _at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.closed_months
    WHERE workspace_id = _workspace_id AND month = date_trunc('month', _at)::date
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_month_closed(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_month_closed(uuid, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_closed_month_projects()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_delivered AND public.is_month_closed(OLD.workspace_id, OLD.delivered_at) AND (
       NEW.agreed_value IS DISTINCT FROM OLD.agreed_value
    OR NEW.custos_extras IS DISTINCT FROM OLD.custos_extras
    OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
    OR NEW.is_delivered IS DISTINCT FROM OLD.is_delivered) THEN
    RAISE EXCEPTION 'Mês fechado: reabra o mês em Finanças → Fechos para alterar este trabalho.';
  END IF;
  IF NEW.is_delivered AND NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
     AND public.is_month_closed(NEW.workspace_id, NEW.delivered_at) THEN
    RAISE EXCEPTION 'Mês fechado: não é possível entregar trabalhos num mês já fechado.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_closed_month_projects BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_month_projects();

CREATE OR REPLACE FUNCTION public.guard_closed_month_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; pid uuid;
BEGIN
  pid := COALESCE(NEW.project_id, OLD.project_id);
  SELECT workspace_id, is_delivered, delivered_at INTO r FROM public.projects WHERE id = pid;
  IF r.is_delivered AND public.is_month_closed(r.workspace_id, r.delivered_at) THEN
    IF TG_OP = 'UPDATE' AND NEW.payment_amount IS NOT DISTINCT FROM OLD.payment_amount
       AND NEW.phase IS NOT DISTINCT FROM OLD.phase AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
      RETURN NEW; -- payment status / receipt changes allowed
    END IF;
    RAISE EXCEPTION 'Mês fechado: reabra o mês em Finanças → Fechos para alterar a equipa deste trabalho.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_guard_closed_month_team BEFORE INSERT OR UPDATE OR DELETE ON public.project_team
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_month_team();

CREATE TABLE public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.payment_receipts TO authenticated;
GRANT ALL ON public.payment_receipts TO service_role;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payment managers view receipts" ON public.payment_receipts FOR SELECT TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.view'));
CREATE POLICY "Payment managers add receipts" ON public.payment_receipts FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.view') AND created_by = auth.uid());
CREATE POLICY "Admins delete receipts" ON public.payment_receipts FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE INDEX idx_payment_receipts_ws ON public.payment_receipts(workspace_id);

ALTER TABLE public.project_team ADD COLUMN receipt_id uuid REFERENCES public.payment_receipts(id) ON DELETE SET NULL;
CREATE INDEX idx_project_team_receipt ON public.project_team(receipt_id);

CREATE POLICY "Receipts files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.has_workspace_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'payments.view'));
CREATE POLICY "Receipts files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND public.has_workspace_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'payments.view'));

CREATE OR REPLACE FUNCTION public.send_month_end_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; m_start date := date_trunc('month', now())::date; label text;
BEGIN
  IF (now() + interval '1 day')::date <> (m_start + interval '1 month')::date THEN RETURN; END IF;
  label := to_char(now(), 'MM/YYYY');
  FOR w IN
    SELECT ws.id,
      (SELECT count(*) FROM projects p WHERE p.workspace_id = ws.id AND p.is_delivered AND p.delivered_at >= m_start) AS delivered,
      (SELECT COALESCE(sum(pt.payment_amount),0) FROM project_team pt JOIN projects p ON p.id = pt.project_id
        WHERE p.workspace_id = ws.id AND p.is_delivered AND pt.payment_status = 'pendente') AS payable
    FROM workspaces ws
    WHERE NOT EXISTS (SELECT 1 FROM closed_months c WHERE c.workspace_id = ws.id AND c.month = m_start)
  LOOP
    IF w.delivered = 0 AND w.payable = 0 THEN CONTINUE; END IF;
    INSERT INTO notifications (workspace_id, user_id, type, title, message, entity_type)
    SELECT w.id, wm.user_id, 'info', 'Fechar mês ' || label,
      w.delivered || ' trabalhos entregues este mês · ' || to_char(w.payable, 'FM999G999G990D00') || ' € por pagar à equipa. Reveja e feche o mês em Finanças → Fechos.',
      'month_close'
    FROM workspace_members wm
    WHERE wm.workspace_id = w.id AND wm.is_active AND wm.role = 'admin';
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.send_month_end_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_month_end_reminders() TO service_role;

SELECT cron.schedule('month-end-reminder-daily', '0 9 * * *', $$SELECT public.send_month_end_reminders();$$);