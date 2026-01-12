-- Create waitlist table for beta landing page
CREATE TABLE public.beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  source TEXT DEFAULT 'landing',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  invited_at TIMESTAMP WITH TIME ZONE,
  invite_token_id UUID REFERENCES public.beta_invite_tokens(id)
);

-- Enable RLS
ALTER TABLE public.beta_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (for waitlist form)
CREATE POLICY "Anyone can join waitlist" ON public.beta_waitlist
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can view (admin panel)
CREATE POLICY "Authenticated users can view waitlist" ON public.beta_waitlist
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only authenticated users can update (to mark as invited)
CREATE POLICY "Authenticated users can update waitlist" ON public.beta_waitlist
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Only authenticated users can delete
CREATE POLICY "Authenticated users can delete from waitlist" ON public.beta_waitlist
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add index for email lookups
CREATE INDEX idx_beta_waitlist_email ON public.beta_waitlist(email);
CREATE INDEX idx_beta_waitlist_created_at ON public.beta_waitlist(created_at DESC);