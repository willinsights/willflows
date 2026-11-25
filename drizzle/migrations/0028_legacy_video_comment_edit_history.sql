ALTER TABLE public.video_comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

COMMENT ON COLUMN public.video_comments.edited_at IS 'Data da última edição do comentário através do link de revisão.';