-- Create table for beta invite tokens
CREATE TABLE public.beta_invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  email TEXT, -- optional, to limit to specific email
  used_by UUID,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT -- ex: "Cliente X", "Beta tester"
);

-- Enable RLS
ALTER TABLE public.beta_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Public can read tokens for verification (but only the token field matters)
CREATE POLICY "Anyone can verify tokens" 
ON public.beta_invite_tokens 
FOR SELECT 
USING (true);

-- Only service role can insert/update/delete (admin operations)
-- No user policies needed since this is managed via SQL/admin

-- Create index for faster token lookups
CREATE INDEX idx_beta_invite_tokens_token ON public.beta_invite_tokens(token);
CREATE INDEX idx_beta_invite_tokens_email ON public.beta_invite_tokens(email);