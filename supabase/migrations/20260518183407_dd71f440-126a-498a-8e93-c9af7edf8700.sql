
-- Add updated_by columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.kanban_columns ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Trigger function: stamp updated_by with auth.uid() when present
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NOT NULL THEN
    NEW.updated_by := v_uid;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers
DROP TRIGGER IF EXISTS set_updated_by_projects ON public.projects;
CREATE TRIGGER set_updated_by_projects
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_updated_by_tasks ON public.tasks;
CREATE TRIGGER set_updated_by_tasks
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_updated_by_kanban_columns ON public.kanban_columns;
CREATE TRIGGER set_updated_by_kanban_columns
  BEFORE INSERT OR UPDATE ON public.kanban_columns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();
