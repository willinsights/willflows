CREATE OR REPLACE FUNCTION public.enqueue_automation_job(_workspace_id uuid, _event_type text, _payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _job_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_workspace_member(_uid, _workspace_id) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  INSERT INTO public.automation_jobs (workspace_id, event_type, payload, created_by)
  VALUES (_workspace_id, _event_type, COALESCE(_payload, '{}'::jsonb), _uid)
  RETURNING id INTO _job_id;

  RETURN _job_id;
END;
$function$;