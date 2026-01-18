-- =============================================
-- CHAT MODULE - DATABASE SCHEMA
-- =============================================

-- 1. ENUMS
CREATE TYPE conversation_type AS ENUM ('channel', 'project', 'dm');
CREATE TYPE message_type AS ENUM ('text', 'post', 'system');
CREATE TYPE followup_status AS ENUM ('open', 'done');

-- 2. CONVERSATIONS TABLE
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type conversation_type NOT NULL,
  name TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT conversations_project_type_check CHECK (
    (type = 'project' AND project_id IS NOT NULL) OR 
    (type != 'project' AND project_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_conversations_workspace ON public.conversations(workspace_id);
CREATE INDEX idx_conversations_project ON public.conversations(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_conversations_type ON public.conversations(type);

-- 3. CONVERSATION MEMBERS TABLE
CREATE TABLE public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX idx_conversation_members_user ON public.conversation_members(user_id);
CREATE INDEX idx_conversation_members_conversation ON public.conversation_members(conversation_id);

-- 4. MESSAGES TABLE
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  type message_type DEFAULT 'text',
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Full-text search
ALTER TABLE public.messages ADD COLUMN body_tsv tsvector 
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(body, ''))) STORED;
CREATE INDEX messages_body_tsv_idx ON public.messages USING GIN (body_tsv);

-- Indexes
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_user ON public.messages(user_id);
CREATE INDEX idx_messages_parent ON public.messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_created ON public.messages(conversation_id, created_at DESC);

-- 5. MESSAGE REACTIONS TABLE
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);

-- 6. MESSAGE ATTACHMENTS TABLE
CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_message_attachments_message ON public.message_attachments(message_id);

-- 7. MESSAGE MENTIONS TABLE
CREATE TABLE public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

CREATE INDEX idx_message_mentions_user ON public.message_mentions(mentioned_user_id);

-- 8. FOLLOWUPS TABLE
CREATE TABLE public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  status followup_status DEFAULT 'open',
  due_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  done_at TIMESTAMPTZ
);

CREATE INDEX idx_followups_assigned ON public.followups(assigned_to, status);
CREATE INDEX idx_followups_workspace ON public.followups(workspace_id);

-- 9. MESSAGE TASK LINKS TABLE
CREATE TABLE public.message_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, task_id)
);

CREATE INDEX idx_message_task_links_task ON public.message_task_links(task_id);

-- 10. POST ACKNOWLEDGMENTS TABLE (Pro feature)
CREATE TABLE public.post_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_post_acks_message ON public.post_acknowledgments(message_id);

-- 11. ADD COLUMNS TO TASKS TABLE
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_from_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_acknowledgments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- CONVERSATIONS: Members can view
CREATE POLICY "Members can view conversations" ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversations.id 
      AND cm.user_id = auth.uid()
    )
    OR (
      type = 'channel' AND is_private = false 
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = conversations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
      )
    )
  );

-- CONVERSATIONS: Workspace members can create channels
CREATE POLICY "Workspace members can create conversations" ON public.conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_id
      AND wm.user_id = auth.uid()
      AND wm.is_active = true
    )
  );

-- CONVERSATIONS: Admin members can update
CREATE POLICY "Admin members can update conversations" ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversations.id 
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- CONVERSATION MEMBERS: View if member of conversation
CREATE POLICY "Members can view conversation members" ON public.conversation_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id 
      AND cm.user_id = auth.uid()
    )
  );

-- CONVERSATION MEMBERS: Admins can manage
CREATE POLICY "Admins can manage conversation members" ON public.conversation_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id 
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
    OR user_id = auth.uid()
  );

-- MESSAGES: Members can view
CREATE POLICY "Members can view messages" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id 
      AND cm.user_id = auth.uid()
    )
  );

-- MESSAGES: Members can send
CREATE POLICY "Members can send messages" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_id 
      AND cm.user_id = auth.uid()
    )
  );

-- MESSAGES: Authors can update their messages
CREATE POLICY "Authors can update messages" ON public.messages FOR UPDATE
  USING (user_id = auth.uid());

-- MESSAGE REACTIONS: Members can view
CREATE POLICY "Members can view reactions" ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- MESSAGE REACTIONS: Members can add
CREATE POLICY "Members can add reactions" ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- MESSAGE REACTIONS: Users can remove own reactions
CREATE POLICY "Users can remove own reactions" ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- MESSAGE ATTACHMENTS: Members can view
CREATE POLICY "Members can view attachments" ON public.message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- MESSAGE ATTACHMENTS: Message author can add
CREATE POLICY "Message author can add attachments" ON public.message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id 
      AND m.user_id = auth.uid()
    )
  );

-- MESSAGE MENTIONS: Members can view
CREATE POLICY "Members can view mentions" ON public.message_mentions FOR SELECT
  USING (
    mentioned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_mentions.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- MESSAGE MENTIONS: Message author can add
CREATE POLICY "Message author can add mentions" ON public.message_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id 
      AND m.user_id = auth.uid()
    )
  );

-- FOLLOWUPS: Creator and assignee can view
CREATE POLICY "Users can view their followups" ON public.followups FOR SELECT
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

-- FOLLOWUPS: Workspace members can create
CREATE POLICY "Workspace members can create followups" ON public.followups FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_id
      AND wm.user_id = auth.uid()
      AND wm.is_active = true
    )
  );

-- FOLLOWUPS: Creator and assignee can update
CREATE POLICY "Users can update their followups" ON public.followups FOR UPDATE
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

-- MESSAGE TASK LINKS: Members can view
CREATE POLICY "Members can view message task links" ON public.message_task_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_task_links.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- MESSAGE TASK LINKS: Members can create
CREATE POLICY "Members can create message task links" ON public.message_task_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- POST ACKNOWLEDGMENTS: Members can view
CREATE POLICY "Members can view post acks" ON public.post_acknowledgments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = post_acknowledgments.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- POST ACKNOWLEDGMENTS: Users can acknowledge
CREATE POLICY "Users can acknowledge posts" ON public.post_acknowledgments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to create project chat when project is created
CREATE OR REPLACE FUNCTION public.create_project_chat()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Create conversation for the project
  INSERT INTO public.conversations (workspace_id, type, name, project_id, created_by)
  VALUES (NEW.workspace_id, 'project', NEW.name, NEW.id, NEW.created_by)
  RETURNING id INTO v_conversation_id;
  
  -- Add creator as admin member
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, NEW.created_by, 'admin')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create project chat
CREATE TRIGGER trigger_create_project_chat
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.create_project_chat();

-- Function to sync project team members with chat
CREATE OR REPLACE FUNCTION public.sync_project_chat_member()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Find the project chat
  SELECT id INTO v_conversation_id 
  FROM public.conversations 
  WHERE project_id = NEW.project_id AND type = 'project';
  
  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, NEW.user_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to sync project team with chat
CREATE TRIGGER trigger_sync_project_chat_member
AFTER INSERT ON public.project_team
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_chat_member();

-- Function to update conversation updated_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update conversation on new message
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- =============================================
-- ENABLE REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.followups;