
-- 1) invoice_items: align policy with invoices (payments.view for reads, payments.manage for writes)
DROP POLICY IF EXISTS "workspace_members_can_manage_invoice_items" ON public.invoice_items;

CREATE POLICY "invoice_items_select_payments_view"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  public.has_workspace_permission(auth.uid(), workspace_id, 'payments.view')
);

CREATE POLICY "invoice_items_insert_payments_manage"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage')
);

CREATE POLICY "invoice_items_update_payments_manage"
ON public.invoice_items
FOR UPDATE
TO authenticated
USING (
  public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage')
)
WITH CHECK (
  public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage')
);

CREATE POLICY "invoice_items_delete_payments_manage"
ON public.invoice_items
FOR DELETE
TO authenticated
USING (
  public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage')
);

-- 2) Realtime chat-notifications topic: require per-user scoping "chat-notifications:{uid}"
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(topic_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  ws_id uuid;
  conv_id uuid;
  t_id uuid;
  p_id uuid;
  parent_id uuid;
  user_scope uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Per-user notification channel: must be "chat-notifications:{auth.uid()}"
  IF topic_name LIKE 'chat-notifications:%' THEN
    BEGIN
      user_scope := substring(topic_name from 20)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN user_scope = uid;
  END IF;

  -- Workspace-scoped topics
  IF topic_name LIKE 'workspace-presence:%' THEN
    BEGIN
      ws_id := substring(topic_name from 20)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = ws_id AND user_id = uid
    );
  END IF;

  IF topic_name LIKE 'conversations:%' THEN
    BEGIN
      ws_id := substring(topic_name from 15)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = ws_id AND user_id = uid
    );
  END IF;

  IF topic_name LIKE 'kanban-realtime-%' THEN
    BEGIN
      ws_id := substring(topic_name from 17 for 36)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = ws_id AND user_id = uid
    );
  END IF;

  IF topic_name LIKE 'typing:%' THEN
    BEGIN
      conv_id := substring(topic_name from 8)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = conv_id AND user_id = uid
    );
  END IF;

  IF topic_name LIKE 'messages:%' THEN
    BEGIN
      conv_id := substring(topic_name from 10)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = conv_id AND user_id = uid
    );
  END IF;

  IF topic_name LIKE 'thread:%' THEN
    BEGIN
      parent_id := substring(topic_name from 8)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = parent_id AND cm.user_id = uid
    );
  END IF;

  IF topic_name LIKE 'task-chat-%' THEN
    BEGIN
      t_id := substring(topic_name from 11)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1
      FROM public.tasks tk
      JOIN public.workspace_members wm ON wm.workspace_id = tk.workspace_id
      WHERE tk.id = t_id AND wm.user_id = uid
    );
  END IF;

  IF topic_name LIKE 'project-chat-%' THEN
    BEGIN
      p_id := substring(topic_name from 14)::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1
      FROM public.projects pr
      JOIN public.workspace_members wm ON wm.workspace_id = pr.workspace_id
      WHERE pr.id = p_id AND wm.user_id = uid
    );
  END IF;

  RETURN false;
END;
$function$;

-- 3) video_approval_tokens: revoke SELECT on token column; expose via SECURITY DEFINER RPC
REVOKE SELECT (token) ON public.video_approval_tokens FROM authenticated;
REVOKE SELECT (token) ON public.video_approval_tokens FROM anon;

CREATE OR REPLACE FUNCTION public.get_video_approval_token_secret(p_token_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT workspace_id, token
    INTO v_workspace_id, v_token
    FROM public.video_approval_tokens
   WHERE id = p_token_id;

  IF v_workspace_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public.is_workspace_admin(auth.uid(), v_workspace_id) THEN
    RETURN NULL;
  END IF;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_video_approval_token_secret(uuid) TO authenticated;

-- 4) workspace_invitations: revoke SELECT on plaintext token column from clients
REVOKE SELECT (token) ON public.workspace_invitations FROM authenticated;
REVOKE SELECT (token) ON public.workspace_invitations FROM anon;
