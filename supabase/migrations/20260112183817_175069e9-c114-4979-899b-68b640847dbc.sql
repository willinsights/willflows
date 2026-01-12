-- Add RLS policies for beta_invite_tokens table (INSERT, UPDATE, DELETE for authenticated users)

-- Allow authenticated users to create invite tokens
CREATE POLICY "Authenticated users can create invite tokens"
ON public.beta_invite_tokens
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update invite tokens
CREATE POLICY "Authenticated users can update invite tokens"
ON public.beta_invite_tokens
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete invite tokens
CREATE POLICY "Authenticated users can delete invite tokens"
ON public.beta_invite_tokens
FOR DELETE
TO authenticated
USING (true);