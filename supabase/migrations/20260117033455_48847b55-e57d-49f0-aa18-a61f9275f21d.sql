-- Create table for blog share analytics
CREATE TABLE public.blog_share_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'facebook', 'copy_link')),
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT
);

-- Enable RLS
ALTER TABLE public.blog_share_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anonymous tracking)
CREATE POLICY "Allow public insert on blog_share_analytics"
ON public.blog_share_analytics
FOR INSERT
WITH CHECK (true);

-- Allow public read for aggregation
CREATE POLICY "Allow public read on blog_share_analytics"
ON public.blog_share_analytics
FOR SELECT
USING (true);

-- Create index for efficient queries
CREATE INDEX idx_blog_share_analytics_post_id ON public.blog_share_analytics(post_id);
CREATE INDEX idx_blog_share_analytics_platform ON public.blog_share_analytics(platform);
CREATE INDEX idx_blog_share_analytics_shared_at ON public.blog_share_analytics(shared_at DESC);