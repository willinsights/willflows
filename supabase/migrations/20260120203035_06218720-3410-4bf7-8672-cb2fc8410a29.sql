-- Tabela para armazenar nomes personalizados de roles por workspace
CREATE TABLE IF NOT EXISTS public.workspace_role_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  custom_label text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, role)
);

-- Habilitar RLS
ALTER TABLE public.workspace_role_labels ENABLE ROW LEVEL SECURITY;

-- Membros ativos podem ver labels do seu workspace
CREATE POLICY "Members can view role labels"
ON public.workspace_role_labels FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_role_labels.workspace_id
  AND wm.user_id = auth.uid()
  AND wm.is_active = true
));

-- Admins podem gerir labels do seu workspace
CREATE POLICY "Admins can insert role labels"
ON public.workspace_role_labels FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_role_labels.workspace_id
  AND wm.user_id = auth.uid()
  AND wm.role = 'admin'
  AND wm.is_active = true
));

CREATE POLICY "Admins can update role labels"
ON public.workspace_role_labels FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_role_labels.workspace_id
  AND wm.user_id = auth.uid()
  AND wm.role = 'admin'
  AND wm.is_active = true
));

CREATE POLICY "Admins can delete role labels"
ON public.workspace_role_labels FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_role_labels.workspace_id
  AND wm.user_id = auth.uid()
  AND wm.role = 'admin'
  AND wm.is_active = true
));