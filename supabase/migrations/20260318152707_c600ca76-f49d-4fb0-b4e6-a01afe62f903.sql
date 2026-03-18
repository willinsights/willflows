
-- Create cost category enum
CREATE TYPE public.cost_category AS ENUM (
  'equipamento',
  'deslocacao',
  'alojamento',
  'alimentacao',
  'equipa',
  'software',
  'outro'
);

-- Create project_cost_lines table
CREATE TABLE public.project_cost_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category cost_category NOT NULL DEFAULT 'outro',
  description TEXT,
  estimated_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status public.payment_status NOT NULL DEFAULT 'pendente',
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_project_cost_lines_project ON public.project_cost_lines(project_id);
CREATE INDEX idx_project_cost_lines_workspace ON public.project_cost_lines(workspace_id);

-- Auto-update updated_at
CREATE TRIGGER update_project_cost_lines_updated_at
  BEFORE UPDATE ON public.project_cost_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set paid_at when status changes to 'pago'
CREATE OR REPLACE FUNCTION public.handle_cost_line_paid_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'pago' AND (OLD.payment_status IS DISTINCT FROM 'pago') THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  ELSIF NEW.payment_status IS DISTINCT FROM 'pago' AND (OLD.payment_status = 'pago') THEN
    NEW.paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_cost_line_paid_at_trigger
  BEFORE UPDATE ON public.project_cost_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_cost_line_paid_at();

-- RLS
ALTER TABLE public.project_cost_lines ENABLE ROW LEVEL SECURITY;

-- Read: workspace members
CREATE POLICY "Workspace members can view cost lines"
  ON public.project_cost_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = project_cost_lines.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

-- Insert: users with project edit permission
CREATE POLICY "Users with edit permission can insert cost lines"
  ON public.project_cost_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_edit_project(auth.uid(), project_id)
  );

-- Update: users with edit permission
CREATE POLICY "Users with edit permission can update cost lines"
  ON public.project_cost_lines FOR UPDATE
  TO authenticated
  USING (
    public.can_edit_project(auth.uid(), project_id)
  )
  WITH CHECK (
    public.can_edit_project(auth.uid(), project_id)
  );

-- Delete: users with edit permission
CREATE POLICY "Users with edit permission can delete cost lines"
  ON public.project_cost_lines FOR DELETE
  TO authenticated
  USING (
    public.can_edit_project(auth.uid(), project_id)
  );
