-- Add duration field to project_media_links for video durations
ALTER TABLE public.project_media_links 
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create project_comments table
CREATE TABLE IF NOT EXISTS public.project_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for workspace members
CREATE POLICY "Workspace members can view project comments"
  ON public.project_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id AND wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Workspace members can create project comments"
  ON public.project_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id AND wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.project_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments or admins can delete any"
  ON public.project_comments
  FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id AND wm.user_id = auth.uid() AND wm.role = 'admin' AND wm.is_active = true
    )
  );

-- Create updated_at trigger for project_comments
CREATE TRIGGER update_project_comments_updated_at
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();