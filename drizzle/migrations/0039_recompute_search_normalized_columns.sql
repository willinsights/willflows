-- Recompute the stored values with the corrected normalize_search_text().
-- SET EXPRESSION forces a rewrite of the generated column without dropping it,
-- so no client reads a missing column and no row trigger fires.
ALTER TABLE public.projects
  ALTER COLUMN search_name SET EXPRESSION AS (public.normalize_search_text(name)),
  ALTER COLUMN search_code SET EXPRESSION AS (public.normalize_search_text(project_code));

ALTER TABLE public.clients
  ALTER COLUMN search_name SET EXPRESSION AS (public.normalize_search_text(name)),
  ALTER COLUMN search_company SET EXPRESSION AS (public.normalize_search_text(company));

ALTER TABLE public.tasks
  ALTER COLUMN search_title SET EXPRESSION AS (public.normalize_search_text(title));