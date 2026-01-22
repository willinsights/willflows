-- Add sidebar_auto_collapse preference to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS sidebar_auto_collapse BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_preferences.sidebar_auto_collapse IS 'When true, sidebar auto-minimizes when clicking navigation links';