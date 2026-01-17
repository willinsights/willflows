-- Add schedule_minute column to blog_auto_settings
ALTER TABLE public.blog_auto_settings 
ADD COLUMN IF NOT EXISTS schedule_minute integer DEFAULT 0;