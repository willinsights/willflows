
-- Closings (batches) and closing_items — additive, workspace-scoped
CREATE TABLE public.closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','received')),
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.closings TO authenticated;
GRANT ALL ON public.closings TO service_role;

ALTER TABLE public.closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view closings"
  ON public.closings FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can create closings"
  ON public.closings FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Members can update closings"
  ON public.closings FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can delete closings"
  ON public.closings FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.closing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_id UUID NOT NULL REFERENCES public.closings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('revenue','team','extra')),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_payment_id UUID REFERENCES public.project_team(id) ON DELETE SET NULL,
  amount_snapshot NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (closing_id, kind, project_id, team_payment_id)
);

CREATE INDEX idx_closing_items_closing ON public.closing_items(closing_id);
CREATE INDEX idx_closing_items_project ON public.closing_items(project_id);
CREATE INDEX idx_closing_items_kind_project ON public.closing_items(kind, project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.closing_items TO authenticated;
GRANT ALL ON public.closing_items TO service_role;

ALTER TABLE public.closing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view closing items"
  ON public.closing_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.is_workspace_member(c.workspace_id, auth.uid())));

CREATE POLICY "Members can insert closing items"
  ON public.closing_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.is_workspace_member(c.workspace_id, auth.uid())));

CREATE POLICY "Members can update closing items"
  ON public.closing_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.is_workspace_member(c.workspace_id, auth.uid())));

CREATE POLICY "Members can delete closing items"
  ON public.closing_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.is_workspace_member(c.workspace_id, auth.uid())));

CREATE TRIGGER trg_closings_updated_at
  BEFORE UPDATE ON public.closings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
