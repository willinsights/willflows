ALTER TABLE public.project_team ADD COLUMN IF NOT EXISTS cost_amount numeric NULL;

ALTER TABLE public.project_team DISABLE TRIGGER USER;
UPDATE public.project_team SET cost_amount = payment_amount WHERE cost_amount IS NULL AND payment_amount IS NOT NULL;
ALTER TABLE public.project_team ENABLE TRIGGER USER;

CREATE OR REPLACE FUNCTION public.sync_project_people_costs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := COALESCE(NEW.project_id, OLD.project_id);
BEGIN
  UPDATE public.projects p SET
    custo_captacao = COALESCE((SELECT sum(COALESCE(cost_amount, payment_amount)) FROM public.project_team WHERE project_id = pid AND phase::text = 'captacao'), 0),
    custo_edicao   = COALESCE((SELECT sum(COALESCE(cost_amount, payment_amount)) FROM public.project_team WHERE project_id = pid AND phase::text = 'edicao'), 0)
  WHERE p.id = pid;
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    UPDATE public.projects p SET
      custo_captacao = COALESCE((SELECT sum(COALESCE(cost_amount, payment_amount)) FROM public.project_team WHERE project_id = OLD.project_id AND phase::text = 'captacao'), 0),
      custo_edicao   = COALESCE((SELECT sum(COALESCE(cost_amount, payment_amount)) FROM public.project_team WHERE project_id = OLD.project_id AND phase::text = 'edicao'), 0)
    WHERE p.id = OLD.project_id;
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.guard_closed_month_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; pid uuid;
BEGIN
  pid := COALESCE(NEW.project_id, OLD.project_id);
  SELECT workspace_id, is_delivered, delivered_at INTO r FROM public.projects WHERE id = pid;
  IF r.is_delivered AND public.is_month_closed(r.workspace_id, r.delivered_at) THEN
    IF TG_OP = 'UPDATE' AND NEW.payment_amount IS NOT DISTINCT FROM OLD.payment_amount
       AND NEW.cost_amount IS NOT DISTINCT FROM OLD.cost_amount
       AND NEW.phase IS NOT DISTINCT FROM OLD.phase AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Mês fechado: reabra o mês em Finanças → Fechos para alterar a equipa deste trabalho.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE VIEW public.v_collaborator_payments AS
 SELECT pt.id AS team_id, pt.project_id, pt.user_id, pt.phase, pt.payment_amount, pt.payment_status, pt.paid_at,
    pt.external_name, pt.is_external, p.name AS project_name, p.project_code, p.workspace_id, p.is_delivered,
    p.delivered_at, p.delivery_date, p.competence_month, p.client_id, c.name AS client_name,
    COALESCE(pr.full_name, pt.external_name, 'Colaborador'::text) AS collaborator_name, pr.avatar_url,
    pt.cost_amount
   FROM project_team pt
     JOIN projects p ON pt.project_id = p.id
     LEFT JOIN clients c ON p.client_id = c.id
     LEFT JOIN profiles pr ON pt.user_id = pr.id;