ALTER TABLE public.workspaces ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');
DO $migration$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO STRICT definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'create_workspace_with_admin';
  IF position('now() + interval ''30 days''' in definition) = 0 THEN
    RAISE EXCEPTION 'Expected workspace trial expression not found';
  END IF;
  definition := replace(definition, 'now() + interval ''30 days'';  -- 30-day trial bonus', 'now() + interval ''7 days'';  -- New-account trial');
  EXECUTE definition;
END;
$migration$;