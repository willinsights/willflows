-- Add meet_url column to client_communications for storing Google Meet links
ALTER TABLE public.client_communications ADD COLUMN IF NOT EXISTS meet_url text;