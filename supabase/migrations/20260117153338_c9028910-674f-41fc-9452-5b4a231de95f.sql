-- Create page_views table for tracking site visits
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  session_id TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);
CREATE INDEX idx_page_views_session_id ON public.page_views(session_id);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking (public pages)
CREATE POLICY "Anyone can insert page views" 
ON public.page_views 
FOR INSERT 
WITH CHECK (true);

-- Only super admins can read page views
CREATE POLICY "Super admins can read page views" 
ON public.page_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.system_admins 
    WHERE user_id = auth.uid()
  )
);

-- Create blog_views table for tracking article views
CREATE TABLE public.blog_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  referrer TEXT,
  user_agent TEXT,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_blog_views_post_id ON public.blog_views(post_id);
CREATE INDEX idx_blog_views_created_at ON public.blog_views(created_at DESC);

-- Enable RLS
ALTER TABLE public.blog_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking
CREATE POLICY "Anyone can insert blog views" 
ON public.blog_views 
FOR INSERT 
WITH CHECK (true);

-- Only super admins can read blog views
CREATE POLICY "Super admins can read blog views" 
ON public.blog_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.system_admins 
    WHERE user_id = auth.uid()
  )
);

-- Add last_login_at to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;