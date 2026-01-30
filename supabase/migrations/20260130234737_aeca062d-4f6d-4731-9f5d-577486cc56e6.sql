-- Create export_jobs table for background export tracking
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL,
  format TEXT NOT NULL,
  filters JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own export jobs
CREATE POLICY "Users can view own export jobs"
ON public.export_jobs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert their own export jobs
CREATE POLICY "Users can create own export jobs"
ON public.export_jobs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Service role can update any job (for background processing)
CREATE POLICY "Service can update export jobs"
ON public.export_jobs FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_workspace 
ON public.export_jobs(user_id, workspace_id, created_at DESC);

-- Create exports storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for exports bucket
CREATE POLICY "Users can read own exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM workspace_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Service can write exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exports');