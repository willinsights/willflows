-- Create feedback table for bug reports and improvement suggestions
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'improvement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  page_url TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all feedback (for future admin panel)
CREATE POLICY "Admins can view all feedback"
  ON public.feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.user_id = auth.uid() 
    AND wm.role = 'admin' 
    AND wm.is_active = true
  ));

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback"
  ON public.feedback FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.user_id = auth.uid() 
    AND wm.role = 'admin' 
    AND wm.is_active = true
  ));