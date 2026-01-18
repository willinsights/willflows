-- Criar bucket para anexos do chat
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS para chat-attachments - upload
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

-- RLS para chat-attachments - view
CREATE POLICY "Users can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- RLS para chat-attachments - delete own
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);