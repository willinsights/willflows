-- Make chat-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;

-- Create a more restrictive SELECT policy for conversation members
CREATE POLICY "Conversation members can view chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 
    FROM public.message_attachments ma
    JOIN public.messages m ON m.id = ma.message_id
    JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
    WHERE ma.file_path = name
    AND cm.user_id = auth.uid()
  )
);