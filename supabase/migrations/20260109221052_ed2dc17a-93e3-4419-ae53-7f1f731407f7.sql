-- Add a direct foreign key from workspace_members.user_id to profiles.id
-- This allows PostgREST to resolve the join with profiles!inner
ALTER TABLE public.workspace_members
ADD CONSTRAINT workspace_members_user_profile_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id);