-- Criar tabela para metas mensais do workspace
CREATE TABLE public.workspace_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- formato YYYY-MM
  revenue_goal DECIMAL(12,2) DEFAULT 0,
  projects_goal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, month)
);

-- Enable RLS
ALTER TABLE public.workspace_goals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "workspace_goals_select" ON public.workspace_goals
  FOR SELECT USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "workspace_goals_insert" ON public.workspace_goals
  FOR INSERT WITH CHECK (
    public.is_workspace_admin(auth.uid(), workspace_id)
  );

CREATE POLICY "workspace_goals_update" ON public.workspace_goals
  FOR UPDATE USING (
    public.is_workspace_admin(auth.uid(), workspace_id)
  );

CREATE POLICY "workspace_goals_delete" ON public.workspace_goals
  FOR DELETE USING (
    public.is_workspace_admin(auth.uid(), workspace_id)
  );

-- Trigger para updated_at
CREATE TRIGGER update_workspace_goals_updated_at
  BEFORE UPDATE ON public.workspace_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();