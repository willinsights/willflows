-- =====================================================
-- WillFlow SaaS - Complete Database Schema
-- Multi-tenant architecture for photo/video production
-- =====================================================

-- 1. ENUM TYPES
-- =====================================================

-- App roles for permission system
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'captacao', 'freelancer', 'visualizador');

-- Project types
CREATE TYPE public.project_type AS ENUM ('fotografia', 'video', 'foto_video');

-- Project categories
CREATE TYPE public.project_category AS ENUM ('hotel', 'experiencia', 'evento', 'outro');

-- Priority levels
CREATE TYPE public.priority_level AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Payment status
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'vencido', 'cancelado');

-- Kanban phase
CREATE TYPE public.kanban_phase AS ENUM ('captacao', 'edicao');

-- Subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('essencial', 'pro', 'studio');

-- Country/region for locale settings
CREATE TYPE public.country_region AS ENUM ('PT', 'BR');


-- 2. WORKSPACES (Multi-tenant)
-- =====================================================

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country public.country_region NOT NULL DEFAULT 'PT',
  currency TEXT NOT NULL DEFAULT 'EUR',
  timezone TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  locale TEXT NOT NULL DEFAULT 'pt-PT',
  logo_url TEXT,
  subscription_plan public.subscription_plan NOT NULL DEFAULT 'essencial',
  subscription_status TEXT NOT NULL DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;


-- 3. USER PROFILES
-- =====================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- 4. WORKSPACE MEMBERS (User-Workspace relationship)
-- =====================================================

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'visualizador',
  specialization TEXT[], -- ['foto', 'video'] for freelancers
  hourly_rate DECIMAL(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;


-- 5. KANBAN COLUMNS
-- =====================================================

CREATE TABLE public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phase public.kanban_phase NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8224e3',
  position INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN NOT NULL DEFAULT false, -- True for "Entregue" column
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;


-- 6. CLIENTS (CRM)
-- =====================================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  nif TEXT, -- Tax ID
  address TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  notes TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;


-- 7. PROJECTS
-- =====================================================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type public.project_type NOT NULL,
  category public.project_category NOT NULL DEFAULT 'outro',
  priority public.priority_level NOT NULL DEFAULT 'media',
  
  -- Location
  country TEXT,
  region TEXT,
  city TEXT,
  address TEXT,
  
  -- Dates
  shoot_date DATE,
  shoot_start_time TIME,
  shoot_end_time TIME,
  delivery_date DATE,
  
  -- Status tracking
  current_phase public.kanban_phase NOT NULL DEFAULT 'captacao',
  captacao_column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  edicao_column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  is_delivered BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,
  
  -- Financial
  agreed_value DECIMAL(12, 2),
  estimated_costs DECIMAL(12, 2),
  payment_method TEXT,
  
  -- Additional
  notes TEXT,
  internal_notes TEXT,
  
  -- Integrations
  frameio_project_id TEXT,
  drive_folder_url TEXT,
  dropbox_folder_url TEXT,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;


-- 8. PROJECT TEAM (Many-to-many: Projects <-> Users)
-- =====================================================

CREATE TABLE public.project_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase public.kanban_phase NOT NULL, -- Which phase they're assigned to
  payment_amount DECIMAL(10, 2), -- What they'll be paid for this project
  payment_status public.payment_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id, phase)
);

ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;


-- 9. TASKS (Kanban cards)
-- =====================================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  phase public.kanban_phase NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  priority public.priority_level NOT NULL DEFAULT 'media',
  
  -- Dates
  due_date DATE,
  due_time TIME,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Position in column
  position INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_completed BOOLEAN NOT NULL DEFAULT false,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;


-- 10. TASK ASSIGNEES
-- =====================================================

CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;


-- 11. TASK CHECKLISTS
-- =====================================================

CREATE TABLE public.task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;


-- 12. TASK COMMENTS
-- =====================================================

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments TEXT[], -- Array of file URLs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;


-- 13. TASK ATTACHMENTS
-- =====================================================

CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;


-- 14. ACTIVITY LOG
-- =====================================================

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, -- 'project', 'task', 'client', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'moved', etc.
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;


-- 15. PAYMENTS
-- =====================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Payment direction
  is_receivable BOOLEAN NOT NULL, -- true = from client, false = to collaborator
  
  -- Party involved
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  collaborator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status public.payment_status NOT NULL DEFAULT 'pendente',
  
  due_date DATE,
  paid_at TIMESTAMPTZ,
  
  description TEXT,
  invoice_number TEXT,
  invoice_url TEXT,
  
  -- Bank details for export
  bank_name TEXT,
  bank_iban TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;


-- 16. CALENDAR EVENTS
-- =====================================================

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting', -- 'meeting', 'task', 'deadline'
  
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  
  location TEXT,
  video_call_url TEXT, -- Google Meet link
  
  -- External calendar sync
  google_event_id TEXT,
  outlook_event_id TEXT,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;


-- 17. EVENT ATTENDEES
-- =====================================================

CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;


-- 18. WORKSPACE INVITATIONS
-- =====================================================

CREATE TABLE public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'visualizador',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;


-- 19. PROJECT TEMPLATES
-- =====================================================

CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.project_type NOT NULL,
  task_templates JSONB NOT NULL DEFAULT '[]', -- Array of task template objects
  checklist_templates JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if user is member of a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND is_active = true
  )
$$;

-- Function to check user role in workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE user_id = _user_id
    AND workspace_id = _workspace_id
    AND is_active = true
  LIMIT 1
$$;

-- Function to check if user has admin role in workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role = 'admin'
      AND is_active = true
  )
$$;


-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Workspace members can view profiles of other members"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = profiles.id
        AND wm1.is_active = true
        AND wm2.is_active = true
    )
  );


-- WORKSPACES POLICIES
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Admins can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- WORKSPACE_MEMBERS POLICIES
CREATE POLICY "Members can view other members in their workspace"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage workspace members"
  ON public.workspace_members FOR ALL
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Users can insert themselves as members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- KANBAN_COLUMNS POLICIES
CREATE POLICY "Members can view kanban columns"
  ON public.kanban_columns FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage kanban columns"
  ON public.kanban_columns FOR ALL
  USING (public.is_workspace_admin(auth.uid(), workspace_id));


-- CLIENTS POLICIES
CREATE POLICY "Members can view clients"
  ON public.clients FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins and editors can manage clients"
  ON public.clients FOR ALL
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor')
  );


-- PROJECTS POLICIES
CREATE POLICY "Members can view projects in their workspace"
  ON public.projects FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members with editing rights can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor', 'captacao')
  );

CREATE POLICY "Members with editing rights can update projects"
  ON public.projects FOR UPDATE
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor', 'captacao')
  );

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));


-- PROJECT_TEAM POLICIES
CREATE POLICY "Members can view project team"
  ON public.project_team FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team.project_id
        AND public.is_workspace_member(auth.uid(), p.workspace_id)
    )
  );

CREATE POLICY "Members with editing rights can manage project team"
  ON public.project_team FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team.project_id
        AND public.get_workspace_role(auth.uid(), p.workspace_id) IN ('admin', 'editor')
    )
  );


-- TASKS POLICIES
CREATE POLICY "Members can view tasks"
  ON public.tasks FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members with editing rights can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor', 'captacao')
  );

CREATE POLICY "Members with editing rights can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor', 'captacao')
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));


-- TASK_ASSIGNEES POLICIES
CREATE POLICY "Members can view task assignees"
  ON public.task_assignees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );

CREATE POLICY "Members with editing rights can manage task assignees"
  ON public.task_assignees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND public.get_workspace_role(auth.uid(), t.workspace_id) IN ('admin', 'editor', 'captacao')
    )
  );


-- TASK_CHECKLISTS POLICIES
CREATE POLICY "Members can view checklists"
  ON public.task_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_checklists.task_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );

CREATE POLICY "Assignees and editors can manage checklists"
  ON public.task_checklists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_checklists.task_id
        AND (
          public.get_workspace_role(auth.uid(), t.workspace_id) IN ('admin', 'editor', 'captacao')
          OR EXISTS (
            SELECT 1 FROM public.task_assignees ta
            WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
          )
        )
    )
  );


-- TASK_COMMENTS POLICIES
CREATE POLICY "Members can view comments"
  ON public.task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );

CREATE POLICY "Members can create comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.task_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.task_comments FOR DELETE
  USING (auth.uid() = user_id);


-- TASK_ATTACHMENTS POLICIES
CREATE POLICY "Members can view attachments"
  ON public.task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );

CREATE POLICY "Members can upload attachments"
  ON public.task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND public.is_workspace_member(auth.uid(), t.workspace_id)
    )
  );

CREATE POLICY "Uploaders and admins can delete attachments"
  ON public.task_attachments FOR DELETE
  USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND public.is_workspace_admin(auth.uid(), t.workspace_id)
    )
  );


-- ACTIVITY_LOG POLICIES
CREATE POLICY "Members can view activity log"
  ON public.activity_log FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "System can insert activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));


-- PAYMENTS POLICIES
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Collaborators can view their own payments"
  ON public.payments FOR SELECT
  USING (
    is_receivable = false 
    AND collaborator_id = auth.uid()
    AND public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL
  USING (public.is_workspace_admin(auth.uid(), workspace_id));


-- CALENDAR_EVENTS POLICIES
CREATE POLICY "Members can view calendar events"
  ON public.calendar_events FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members with editing rights can create events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor', 'captacao')
  );

CREATE POLICY "Event creators and admins can update events"
  ON public.calendar_events FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_workspace_admin(auth.uid(), workspace_id)
  );

CREATE POLICY "Event creators and admins can delete events"
  ON public.calendar_events FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.is_workspace_admin(auth.uid(), workspace_id)
  );


-- EVENT_ATTENDEES POLICIES
CREATE POLICY "Members can view event attendees"
  ON public.event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_attendees.event_id
        AND public.is_workspace_member(auth.uid(), e.workspace_id)
    )
  );

CREATE POLICY "Event creators can manage attendees"
  ON public.event_attendees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_attendees.event_id
        AND (e.created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), e.workspace_id))
    )
  );

CREATE POLICY "Users can update their own attendance status"
  ON public.event_attendees FOR UPDATE
  USING (user_id = auth.uid());


-- WORKSPACE_INVITATIONS POLICIES
CREATE POLICY "Admins can view invitations"
  ON public.workspace_invitations FOR SELECT
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can create invitations"
  ON public.workspace_invitations FOR INSERT
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete invitations"
  ON public.workspace_invitations FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Anyone can view invitation by token"
  ON public.workspace_invitations FOR SELECT
  USING (true); -- Token lookup needed for accepting invitations


-- PROJECT_TEMPLATES POLICIES
CREATE POLICY "Members can view templates"
  ON public.project_templates FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage templates"
  ON public.project_templates FOR ALL
  USING (public.is_workspace_admin(auth.uid(), workspace_id));


-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kanban_columns_updated_at BEFORE UPDATE ON public.kanban_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_templates_updated_at BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Auto-create default kanban columns when workspace is created
CREATE OR REPLACE FUNCTION public.create_default_kanban_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Captação columns
  INSERT INTO public.kanban_columns (workspace_id, phase, name, color, position, is_final) VALUES
    (NEW.id, 'captacao', 'A agendar', '#6b7280', 0, false),
    (NEW.id, 'captacao', 'Agendado', '#3b82f6', 1, false),
    (NEW.id, 'captacao', 'Em execução', '#f59e0b', 2, false),
    (NEW.id, 'captacao', 'Entregue', '#22c55e', 3, true);
  
  -- Edição columns
  INSERT INTO public.kanban_columns (workspace_id, phase, name, color, position, is_final) VALUES
    (NEW.id, 'edicao', 'A iniciar', '#6b7280', 0, false),
    (NEW.id, 'edicao', 'Em edição', '#8b5cf6', 1, false),
    (NEW.id, 'edicao', 'Em revisão', '#f59e0b', 2, false),
    (NEW.id, 'edicao', 'Entregue', '#22c55e', 3, true);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.create_default_kanban_columns();


-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_column ON public.tasks(column_id);
CREATE INDEX idx_clients_workspace ON public.clients(workspace_id);
CREATE INDEX idx_payments_workspace ON public.payments(workspace_id);
CREATE INDEX idx_calendar_events_workspace ON public.calendar_events(workspace_id);
CREATE INDEX idx_activity_log_workspace ON public.activity_log(workspace_id);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);