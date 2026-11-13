DO $mig$
DECLARE
  d text;
  svc constant text := $g$auth.role() = 'service_role'$g$;
BEGIN
  d := pg_get_functiondef('public.can_deliver_project(uuid,text)'::regprocedure);
  d := regexp_replace(d, E'\nBEGIN\n', E'\nBEGIN\n  IF NOT (' || svc || $g$ OR EXISTS (SELECT 1 FROM public.projects gp WHERE gp.id = p_project_id AND (public.is_workspace_member(auth.uid(), gp.workspace_id) OR public.is_system_admin()))) THEN
    RETURN jsonb_build_object('can_deliver', false, 'reason', 'Sem permissão', 'pending_tasks', 0, 'pending_checklists', 0);
  END IF;
$g$);
  EXECUTE d;

  d := pg_get_functiondef('public.deliver_project(uuid,text,uuid)'::regprocedure);
  d := regexp_replace(d, E'\nBEGIN\n', E'\nBEGIN\n  IF NOT (' || svc || $g$ OR public.can_edit_project(auth.uid(), p_project_id)) THEN
    RAISE EXCEPTION 'Sem permissão para entregar este projeto' USING ERRCODE = '42501';
  END IF;
$g$);
  EXECUTE d;

  d := pg_get_functiondef('public.deliver_project(uuid,text,uuid,timestamptz)'::regprocedure);
  d := regexp_replace(d, E'\nBEGIN\n', E'\nBEGIN\n  IF NOT (' || svc || $g$ OR public.can_edit_project(auth.uid(), p_project_id)) THEN
    RAISE EXCEPTION 'Sem permissão para entregar este projeto' USING ERRCODE = '42501';
  END IF;
$g$);
  EXECUTE d;

  d := pg_get_functiondef('public.check_storage_quota(uuid,bigint)'::regprocedure);
  d := regexp_replace(d, E'\nBEGIN\n', E'\nBEGIN\n  IF NOT (' || svc || $g$ OR public.is_workspace_member(auth.uid(), p_workspace_id) OR public.is_system_admin()) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
$g$);
  EXECUTE d;

  d := pg_get_functiondef('public.get_effective_vat(uuid,uuid)'::regprocedure);
  d := regexp_replace(d, E'\nBEGIN\n', E'\nBEGIN\n  IF NOT (' || svc || $g$ OR public.is_workspace_member(auth.uid(), p_workspace_id) OR public.is_system_admin()) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
$g$);
  EXECUTE d;
END
$mig$;

CREATE OR REPLACE FUNCTION public.can_edit_project(_user_id uuid, _project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role' OR public.is_system_admin()) AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = _project_id
      AND has_workspace_permission(_user_id, p.workspace_id, 'projects.edit')
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_conversation_members(_conversation_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role' OR public.is_system_admin()) AND (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = _conversation_id AND c.created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM workspace_members wm
    JOIN conversations c ON c.workspace_id = wm.workspace_id
    WHERE c.id = _conversation_id
    AND wm.user_id = _user_id
    AND wm.role IN ('admin', 'edicao')
    AND wm.is_active = true
  ));
$function$;

REVOKE EXECUTE ON FUNCTION public.deliver_project(uuid,text,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deliver_project(uuid,text,uuid,timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_deliver_project(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_storage_quota(uuid,bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_effective_vat(uuid,uuid) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.beta_waitlist;
CREATE POLICY "Anyone can join waitlist" ON public.beta_waitlist FOR INSERT TO anon, authenticated
WITH CHECK (
  email IS NOT NULL AND length(email) <= 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (name IS NULL OR length(name) <= 200)
  AND (company IS NULL OR length(company) <= 200)
  AND (source IS NULL OR length(source) <= 100)
  AND notes IS NULL AND invited_at IS NULL
);

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;