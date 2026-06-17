
-- Helper function: decides if the current user can subscribe to a given Realtime topic.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(topic_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ws_id uuid;
  conv_id uuid;
  t_id uuid;
  p_id uuid;
  parent_id uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Per-user notification channel (rows still protected by table RLS)
  IF topic_name = 'chat-notifications' THEN
    RETURN true;
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

  -- kanban-realtime-{workspace_uuid}-{phase}
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

  -- Conversation-scoped topics
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

  -- Task / project chat topics
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

  -- Unknown topic — deny by default
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_realtime_topic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(text) TO authenticated;

-- Enable RLS on realtime.messages and add topic-based authorization policies.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe to authorized topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to authorized topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_access_realtime_topic((realtime.topic())::text));

DROP POLICY IF EXISTS "Authenticated users can broadcast to authorized topics" ON realtime.messages;
CREATE POLICY "Authenticated users can broadcast to authorized topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_realtime_topic((realtime.topic())::text));
