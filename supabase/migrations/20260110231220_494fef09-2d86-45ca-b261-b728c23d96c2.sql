-- Create client_communications table
CREATE TABLE public.client_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'other',
  subject TEXT NOT NULL,
  description TEXT,
  contact_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create client_notes table
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_communications
CREATE POLICY "Members can view client communications"
ON public.client_communications
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members with editing rights can manage communications"
ON public.client_communications
FOR ALL
USING (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));

-- RLS policies for client_notes
CREATE POLICY "Members can view client notes"
ON public.client_notes
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members with editing rights can manage notes"
ON public.client_notes
FOR ALL
USING (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));

-- Create indexes for better performance
CREATE INDEX idx_client_communications_client_id ON public.client_communications(client_id);
CREATE INDEX idx_client_communications_workspace_id ON public.client_communications(workspace_id);
CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_client_notes_workspace_id ON public.client_notes(workspace_id);