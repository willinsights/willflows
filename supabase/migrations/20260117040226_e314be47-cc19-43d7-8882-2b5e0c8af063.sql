-- Add cover image credit fields to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS cover_image_credit TEXT,
ADD COLUMN IF NOT EXISTS cover_image_source TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.blog_posts.cover_image_credit IS 'Credit text for the cover image (e.g., "Foto de João Silva")';
COMMENT ON COLUMN public.blog_posts.cover_image_source IS 'URL to the photographer profile or source';