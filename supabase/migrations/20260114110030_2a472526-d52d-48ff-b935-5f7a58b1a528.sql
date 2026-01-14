-- Create table for Google Calendar integration
CREATE TABLE public.google_calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- OAuth tokens (encrypted in practice, stored securely)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- User's Google Calendar ID to sync with
  calendar_id TEXT DEFAULT 'primary',
  
  -- Sync preferences
  sync_shoots BOOLEAN DEFAULT true,
  sync_deliveries BOOLEAN DEFAULT true,
  sync_meetings BOOLEAN DEFAULT true,
  sync_events BOOLEAN DEFAULT true,
  
  -- Import from Google
  import_from_google BOOLEAN DEFAULT false,
  
  -- Sync state
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One connection per user per workspace
  UNIQUE(user_id, workspace_id)
);

-- Create table to track synced events (prevent duplicates)
CREATE TABLE public.google_calendar_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.google_calendar_connections(id) ON DELETE CASCADE,
  
  -- Local reference
  entity_type TEXT NOT NULL, -- 'project_shoot', 'project_delivery', 'calendar_event'
  entity_id UUID NOT NULL,
  
  -- Google reference
  google_event_id TEXT NOT NULL,
  
  -- Sync direction
  sync_direction TEXT NOT NULL DEFAULT 'to_google', -- 'to_google' or 'from_google'
  
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(connection_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for connections
CREATE POLICY "Users can view their own connections" 
ON public.google_calendar_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections" 
ON public.google_calendar_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON public.google_calendar_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.google_calendar_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for sync log
CREATE POLICY "Users can view their sync logs" 
ON public.google_calendar_sync_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.google_calendar_connections c 
    WHERE c.id = connection_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their sync logs" 
ON public.google_calendar_sync_log 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.google_calendar_connections c 
    WHERE c.id = connection_id AND c.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_google_calendar_connections_updated_at
BEFORE UPDATE ON public.google_calendar_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();