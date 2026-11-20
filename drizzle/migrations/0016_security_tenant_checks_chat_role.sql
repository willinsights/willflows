-- 1) Kanban metrics: original body kept private, membership-checked wrapper exposed.
ALTER FUNCTION public.get_kanban_metrics(uuid, timestamptz, timestamptz) RENAME TO get_kanban_metrics_unchecked;
REVOKE EXECUTE ON FUNCTION public.get_kanban_metrics_unchecked(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_kanban_metrics(p_workspace_id uuid, p_start_date timestamptz DEFAULT (now() - '30 days'::interval), p_end_date timestamptz DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Sem acesso a este workspace' USING ERRCODE = '42501';
  END IF;
  RETURN public.get_kanban_metrics_unchecked(p_workspace_id, p_start_date, p_end_date);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_kanban_metrics(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_kanban_metrics(uuid, timestamptz, timestamptz) TO authenticated, service_role;

-- 2) Monthly financial summary: permission-checked wrapper.
ALTER FUNCTION public.get_monthly_summary(uuid, integer, integer) RENAME TO get_monthly_summary_unchecked;
REVOKE EXECUTE ON FUNCTION public.get_monthly_summary_unchecked(uuid, integer, integer) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_monthly_summary(p_workspace_id uuid, p_year integer, p_month integer)
 RETURNS TABLE(total_revenue numeric, total_cost numeric, total_profit numeric, margin_percent numeric, project_count bigint, delivered_count bigint, team_payments_pending numeric, team_payments_paid numeric, extras_pending numeric, extras_paid numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND NOT coalesce(public.has_workspace_permission(auth.uid(), p_workspace_id, 'payments.view'), false) THEN
    RAISE EXCEPTION 'Sem acesso aos dados financeiros' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.get_monthly_summary_unchecked(p_workspace_id, p_year, p_month);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_monthly_summary(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_summary(uuid, integer, integer) TO authenticated, service_role;

-- 3) Workspace role lookup bound to the caller.
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id uuid, _workspace_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT wm.role FROM public.workspace_members wm
  WHERE wm.user_id = _user_id
    AND wm.workspace_id = _workspace_id
    AND wm.is_active = true
    AND (
      _user_id = auth.uid()
      OR coalesce(auth.role(), '') = 'service_role'
      OR public.is_workspace_admin(auth.uid(), _workspace_id)
    )
  LIMIT 1
$function$;

-- 4) Realtime topics: same rules as before, but workspace checks require ACTIVE membership.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(topic_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  BEGIN
    IF topic_name LIKE 'chat-notifications:%' THEN
      RETURN substring(topic_name from 20)::uuid = uid;
    ELSIF topic_name LIKE 'workspace-presence:%' THEN
      RETURN public.is_workspace_member(uid, substring(topic_name from 20)::uuid);
    ELSIF topic_name LIKE 'conversations:%' THEN
      RETURN public.is_workspace_member(uid, substring(topic_name from 15)::uuid);
    ELSIF topic_name LIKE 'kanban-realtime-%' THEN
      RETURN public.is_workspace_member(uid, substring(topic_name from 17 for 36)::uuid);
    ELSIF topic_name LIKE 'typing:%' THEN
      v_id := substring(topic_name from 8)::uuid;
      RETURN EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = v_id AND user_id = uid);
    ELSIF topic_name LIKE 'messages:%' THEN
      v_id := substring(topic_name from 10)::uuid;
      RETURN EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = v_id AND user_id = uid);
    ELSIF topic_name LIKE 'thread:%' THEN
      v_id := substring(topic_name from 8)::uuid;
      RETURN EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE m.id = v_id AND cm.user_id = uid);
    ELSIF topic_name LIKE 'task-chat-%' THEN
      v_id := substring(topic_name from 11)::uuid;
      RETURN EXISTS (
        SELECT 1 FROM public.tasks tk
        JOIN public.workspace_members wm ON wm.workspace_id = tk.workspace_id
        WHERE tk.id = v_id AND wm.user_id = uid AND wm.is_active = true);
    ELSIF topic_name LIKE 'project-chat-%' THEN
      v_id := substring(topic_name from 14)::uuid;
      RETURN EXISTS (
        SELECT 1 FROM public.projects pr
        JOIN public.workspace_members wm ON wm.workspace_id = pr.workspace_id
        WHERE pr.id = v_id AND wm.user_id = uid AND wm.is_active = true);
    END IF;
  EXCEPTION WHEN OTHERS THEN RETURN false;
  END;
  RETURN false;
END;
$function$;

-- 5) Chat membership: no self-granted admin role.
DROP POLICY IF EXISTS "Users can insert conversation members" ON public.conversation_members;
CREATE POLICY "Users can insert conversation members" ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_conversation_members(conversation_id, auth.uid())
    OR (user_id = auth.uid() AND coalesce(role, 'member') = 'member'
        AND public.is_public_channel_in_user_workspace(conversation_id, auth.uid()))
    OR (user_id = auth.uid() AND coalesce(role, 'member') = 'member'
        AND public.is_project_chat_in_user_workspace(conversation_id, auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.guard_conversation_member_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND coalesce(auth.role(), '') <> 'service_role'
     AND auth.uid() IS NOT NULL
     AND NOT public.can_manage_conversation_members(NEW.conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para alterar o papel no chat' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.guard_conversation_member_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_conversation_member_role ON public.conversation_members;
CREATE TRIGGER guard_conversation_member_role
  BEFORE UPDATE OF role ON public.conversation_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_conversation_member_role();