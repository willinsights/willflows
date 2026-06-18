-- Grant SELECT to authenticated role on video_approval_tokens
GRANT SELECT ON public.video_approval_tokens TO authenticated;

-- Grant SELECT to anon role too (needed for the public approval page)
GRANT SELECT ON public.video_approval_tokens TO anon;