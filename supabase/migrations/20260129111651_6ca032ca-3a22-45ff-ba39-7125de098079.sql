-- Create table for video structure segments per project
CREATE TABLE public.video_structures (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    min_duration_seconds INTEGER NOT NULL DEFAULT 0,
    max_duration_seconds INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for reusable video structure templates
CREATE TABLE public.video_structure_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    segments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_video_structures_project_id ON public.video_structures(project_id);
CREATE INDEX idx_video_structures_workspace_id ON public.video_structures(workspace_id);
CREATE INDEX idx_video_structure_templates_workspace_id ON public.video_structure_templates(workspace_id);

-- Enable Row Level Security
ALTER TABLE public.video_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_structure_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_structures
-- SELECT: Workspace members can view
CREATE POLICY "Members can view video structures"
ON public.video_structures
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

-- INSERT: Admin, editor, captacao can create
CREATE POLICY "Members with editing rights can create video structures"
ON public.video_structures
FOR INSERT
WITH CHECK (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'captacao'::app_role]));

-- UPDATE: Creator or admin can edit
CREATE POLICY "Creator or admin can update video structures"
ON public.video_structures
FOR UPDATE
USING (created_by = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

-- DELETE: Creator or admin can delete
CREATE POLICY "Creator or admin can delete video structures"
ON public.video_structures
FOR DELETE
USING (created_by = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

-- RLS Policies for video_structure_templates
-- SELECT: Workspace members can view
CREATE POLICY "Members can view video structure templates"
ON public.video_structure_templates
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

-- INSERT: Admin, editor, captacao can create templates
CREATE POLICY "Members with editing rights can create templates"
ON public.video_structure_templates
FOR INSERT
WITH CHECK (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'captacao'::app_role]));

-- UPDATE: Creator or admin can edit
CREATE POLICY "Creator or admin can update templates"
ON public.video_structure_templates
FOR UPDATE
USING (created_by = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

-- DELETE: Creator or admin can delete
CREATE POLICY "Creator or admin can delete templates"
ON public.video_structure_templates
FOR DELETE
USING (created_by = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

-- Enable realtime for video_structures
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_structures;

-- Create trigger for updated_at
CREATE TRIGGER update_video_structures_updated_at
BEFORE UPDATE ON public.video_structures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_structure_templates_updated_at
BEFORE UPDATE ON public.video_structure_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();