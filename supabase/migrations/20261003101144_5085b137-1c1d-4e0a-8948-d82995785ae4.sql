DROP POLICY IF EXISTS "Members can view project team" ON public.project_team;
CREATE POLICY "Own row or financial access can view project team" ON public.project_team
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team.project_id
     AND (public.has_workspace_permission(auth.uid(), p.workspace_id, 'payments.view')
          OR public.can_edit_project(auth.uid(), p.id)))
);

CREATE OR REPLACE FUNCTION public.get_project_team_roster(_project_id uuid)
RETURNS TABLE(id uuid, user_id uuid, phase text, is_external boolean, external_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.user_id, t.phase::text, t.is_external, t.external_name
  FROM public.project_team t JOIN public.projects p ON p.id = t.project_id
  WHERE t.project_id = _project_id AND public.is_workspace_member(auth.uid(), p.workspace_id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_project_team_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_team_roster(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_project_people_costs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := COALESCE(NEW.project_id, OLD.project_id);
BEGIN
  UPDATE public.projects p SET
    custo_captacao = COALESCE((SELECT sum(payment_amount) FROM public.project_team WHERE project_id = pid AND phase::text = 'captacao'), 0),
    custo_edicao   = COALESCE((SELECT sum(payment_amount) FROM public.project_team WHERE project_id = pid AND phase::text = 'edicao'), 0)
  WHERE p.id = pid;
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    UPDATE public.projects p SET
      custo_captacao = COALESCE((SELECT sum(payment_amount) FROM public.project_team WHERE project_id = OLD.project_id AND phase::text = 'captacao'), 0),
      custo_edicao   = COALESCE((SELECT sum(payment_amount) FROM public.project_team WHERE project_id = OLD.project_id AND phase::text = 'edicao'), 0)
    WHERE p.id = OLD.project_id;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_project_people_costs() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_project_people_costs ON public.project_team;
CREATE TRIGGER trg_sync_project_people_costs
AFTER INSERT OR UPDATE OF payment_amount, phase, project_id OR DELETE ON public.project_team
FOR EACH ROW EXECUTE FUNCTION public.sync_project_people_costs();

UPDATE public.projects p SET
  custo_captacao = COALESCE(t.c, 0), custo_edicao = COALESCE(t.e, 0)
FROM (SELECT project_id, sum(payment_amount) FILTER (WHERE phase::text='captacao') c,
             sum(payment_amount) FILTER (WHERE phase::text='edicao') e
      FROM public.project_team GROUP BY project_id) t
WHERE p.id = t.project_id;