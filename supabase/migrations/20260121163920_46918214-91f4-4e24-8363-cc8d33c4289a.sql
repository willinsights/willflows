-- Allow users to update their own membership records (last_read_at, is_muted, is_pinned)
CREATE POLICY "Users can update own membership" 
ON public.conversation_members 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());