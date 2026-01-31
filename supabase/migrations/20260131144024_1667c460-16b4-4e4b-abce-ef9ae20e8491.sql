-- Drop the existing FK that points to auth.users
ALTER TABLE public.project_team DROP CONSTRAINT IF EXISTS project_team_user_id_fkey;

-- Add the correct FK that points to profiles.id
-- This enables the embedded join query profiles:user_id(...) to work properly
ALTER TABLE public.project_team 
ADD CONSTRAINT project_team_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS project_team_user_id_idx ON public.project_team(user_id);