-- Add extra costs column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS custos_extras numeric DEFAULT 0;

-- Add comment to describe the column
COMMENT ON COLUMN public.projects.custos_extras IS 'Additional costs like equipment, travel, etc.';