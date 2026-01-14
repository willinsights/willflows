-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload screenshots
CREATE POLICY "Users can upload feedback screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feedback-screenshots' 
    AND auth.uid() IS NOT NULL
  );

-- Policy: Public read access for screenshots
CREATE POLICY "Public read access for feedback screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feedback-screenshots');

-- Policy: Users can delete their own screenshots
CREATE POLICY "Users can delete own feedback screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'feedback-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add delete policy for admins on feedback table
CREATE POLICY "Admins can delete feedback"
  ON public.feedback FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role = 'admin'
    AND wm.is_active = true
  ));