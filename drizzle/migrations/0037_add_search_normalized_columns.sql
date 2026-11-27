-- Search normalization: a name typed without spaces ("josesilva") must match
-- the stored name ("Jose Silva"). Accents and punctuation are folded away too.
-- Mirrored on the client by src/lib/search-normalize.ts.
CREATE OR REPLACE FUNCTION public.normalize_search_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT regexp_replace(
    lower(
      translate(
        coalesce(p_text, ''),
        'áàâãäåāăąçèéêëēĕėęěìíîïīĭįñńòóôõöōŏőŕśşšţťùúûüūŭůűųýÿźżžøæœđłħŧıß',
        'aaaaaaaaaceeeeeeeeeiiiiiiinnoooooooorsssttuuuuuuuuuyyzzzoaodlhtis'
      )
    ),
    '[^a-z0-9]',
    '',
    'g'
  )
$$;

GRANT EXECUTE ON FUNCTION public.normalize_search_text(text) TO authenticated, service_role;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS search_name text
    GENERATED ALWAYS AS (public.normalize_search_text(name)) STORED,
  ADD COLUMN IF NOT EXISTS search_code text
    GENERATED ALWAYS AS (public.normalize_search_text(project_code)) STORED;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS search_name text
    GENERATED ALWAYS AS (public.normalize_search_text(name)) STORED,
  ADD COLUMN IF NOT EXISTS search_company text
    GENERATED ALWAYS AS (public.normalize_search_text(company)) STORED;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS search_title text
    GENERATED ALWAYS AS (public.normalize_search_text(title)) STORED;