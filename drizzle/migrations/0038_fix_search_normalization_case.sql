-- Fix: fold accents AFTER lowercasing. With translate() first, uppercase
-- accented letters ("JOSÉ", "SÃO") were not in the map and got dropped by the
-- [^a-z0-9] cleanup instead of folding to "jose" / "sao".
CREATE OR REPLACE FUNCTION public.normalize_search_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT regexp_replace(
    translate(
      lower(coalesce(p_text, '')),
      'áàâãäåāăąçèéêëēĕėęěìíîïīĭįñńòóôõöōŏőŕśşšţťùúûüūŭůűųýÿźżžøæœđłħŧıß',
      'aaaaaaaaaceeeeeeeeeiiiiiiinnoooooooorsssttuuuuuuuuuyyzzzoaodlhtis'
    ),
    '[^a-z0-9]',
    '',
    'g'
  )
$$;

GRANT EXECUTE ON FUNCTION public.normalize_search_text(text) TO authenticated, service_role;