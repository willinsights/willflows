CREATE TABLE public.work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  work_type text NOT NULL DEFAULT 'outro',
  assignee_id uuid,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  requested_at date NOT NULL DEFAULT CURRENT_DATE,
  completed_at date,
  status text NOT NULL DEFAULT 'pendente',
  is_urgent boolean NOT NULL DEFAULT false,
  amount numeric(12,2),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_logs_work_type_check CHECK (work_type IN ('edicao_video','edicao_foto','fotografia','captacao','outro')),
  CONSTRAINT work_logs_status_check CHECK (status IN ('pendente','em_curso','concluido'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_logs TO authenticated;
GRANT ALL ON public.work_logs TO service_role;

ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_logs_select_members" ON public.work_logs
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "work_logs_insert_members" ON public.work_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "work_logs_update_owner_or_admin" ON public.work_logs
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND (created_by = auth.uid() OR assignee_id = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id))
  )
  WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND (created_by = auth.uid() OR assignee_id = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id))
  );

CREATE POLICY "work_logs_delete_owner_or_admin" ON public.work_logs
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id))
  );

CREATE INDEX idx_work_logs_workspace_requested ON public.work_logs(workspace_id, requested_at DESC);
CREATE INDEX idx_work_logs_assignee ON public.work_logs(assignee_id);

CREATE TRIGGER update_work_logs_updated_at
  BEFORE UPDATE ON public.work_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS edit_kind text;
ALTER TABLE public.projects ADD CONSTRAINT projects_edit_kind_check CHECK (edit_kind IS NULL OR edit_kind IN ('edicao','reedicao'));