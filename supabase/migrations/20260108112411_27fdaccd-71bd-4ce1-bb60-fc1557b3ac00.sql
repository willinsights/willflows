-- Add missing columns for the complete project modal
-- Project custom ID, financial fields, media links, team assignments

-- Add project_code for manual ID
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_code text;

-- Add Google Meet link
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS google_meet_url text;

-- Add custo_captacao and custo_edicao for financial tracking
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS custo_captacao numeric DEFAULT 0;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS custo_edicao numeric DEFAULT 0;

-- Create project_media_links table for multiple media links per project
CREATE TABLE IF NOT EXISTS public.project_media_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'outro', -- youtube, vimeo, nas, frameio, google_drive, outro
  url text NOT NULL,
  title text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_media_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_media_links
CREATE POLICY "Members can view project media links"
ON public.project_media_links
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_media_links.project_id
  AND is_workspace_member(auth.uid(), p.workspace_id)
));

CREATE POLICY "Members with editing rights can manage project media links"
ON public.project_media_links
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_media_links.project_id
  AND get_workspace_role(auth.uid(), p.workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'captacao'::app_role])
));

-- Create categories table for custom categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#8224e3',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Members can view categories"
ON public.categories
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins and editors can manage categories"
ON public.categories
FOR ALL
USING (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));

-- Add custom_category_id to projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS custom_category_id uuid REFERENCES public.categories(id);

-- Add item_type to projects (projeto_captacao, projeto_edicao, projeto_completo, reuniao)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'projeto_completo';

-- Update payments table to add freelancer payment tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS freelancer_name text;

-- Add task checklists completed/total counters (virtual, computed at query time)

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_workspace_phase ON public.projects(workspace_id, current_phase);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_workspace ON public.payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_categories_workspace ON public.categories(workspace_id);