CREATE OR REPLACE FUNCTION public.get_conversation_page(
  _conversation_id uuid,
  _limit int DEFAULT 50,
  _before timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_member boolean;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _uid
  ) INTO _is_member;

  IF NOT _is_member THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  WITH page AS (
    SELECT m.*
    FROM public.messages m
    WHERE m.conversation_id = _conversation_id
      AND m.parent_message_id IS NULL
      AND m.is_deleted = false
      AND (_before IS NULL OR m.created_at < _before)
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(_limit, 1), 100)
  ),
  msg_ids AS (SELECT id, user_id FROM page),
  profs AS (
    SELECT p.id, p.full_name, p.avatar_url, p.email
    FROM public.profiles p
    WHERE p.id IN (SELECT DISTINCT user_id FROM msg_ids)
  ),
  atts AS (
    SELECT a.message_id,
      jsonb_agg(jsonb_build_object(
        'id', a.id, 'file_name', a.file_name, 'file_path', a.file_path,
        'file_size', a.file_size, 'mime_type', a.mime_type
      )) AS items
    FROM public.message_attachments a
    WHERE a.message_id IN (SELECT id FROM msg_ids)
    GROUP BY a.message_id
  ),
  reacts AS (
    SELECT r.message_id,
      jsonb_agg(jsonb_build_object(
        'emoji', r.emoji, 'user_id', r.user_id
      )) AS items
    FROM public.message_reactions r
    WHERE r.message_id IN (SELECT id FROM msg_ids)
    GROUP BY r.message_id
  ),
  reads AS (
    SELECT rd.message_id,
      jsonb_agg(jsonb_build_object(
        'user_id', rd.user_id, 'read_at', rd.read_at
      )) AS items
    FROM public.message_reads rd
    WHERE rd.message_id IN (SELECT id FROM msg_ids)
    GROUP BY rd.message_id
  )
  SELECT jsonb_build_object(
    'messages', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'conversation_id', p.conversation_id,
        'user_id', p.user_id,
        'body', p.body,
        'type', p.type,
        'parent_message_id', p.parent_message_id,
        'metadata', p.metadata,
        'is_edited', p.is_edited,
        'is_deleted', p.is_deleted,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'user', CASE WHEN pr.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', pr.id, 'full_name', pr.full_name, 'avatar_url', pr.avatar_url, 'email', pr.email
        ) END,
        'attachments', COALESCE(atts.items, '[]'::jsonb),
        'reactions_raw', COALESCE(reacts.items, '[]'::jsonb),
        'reads', COALESCE(reads.items, '[]'::jsonb)
      ) ORDER BY p.created_at DESC
    ), '[]'::jsonb),
    'has_more', (SELECT COUNT(*) FROM page) = LEAST(GREATEST(_limit, 1), 100),
    'oldest_at', (SELECT MIN(created_at) FROM page)
  )
  INTO _result
  FROM page p
  LEFT JOIN profs pr ON pr.id = p.user_id
  LEFT JOIN atts ON atts.message_id = p.id
  LEFT JOIN reacts ON reacts.message_id = p.id
  LEFT JOIN reads ON reads.message_id = p.id;

  RETURN COALESCE(_result, jsonb_build_object('messages','[]'::jsonb,'has_more',false,'oldest_at',NULL));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_page(uuid, int, timestamptz) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON public.messages (conversation_id, created_at DESC)
  WHERE parent_message_id IS NULL AND is_deleted = false;