-- ============================================
-- VIDEO PRODUCTION MODULE - Database Schema
-- ============================================

-- 1) Video Versions - Stores uploaded video files per task
CREATE TABLE public.video_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  mime_type TEXT,
  thumbnail_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, version_number)
);

-- 2) Video Comments - Timestamp-based comments on videos
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_version_id UUID NOT NULL REFERENCES public.video_versions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  timestamp_seconds DECIMAL(10, 3) NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  is_client_comment BOOLEAN NOT NULL DEFAULT false,
  client_name TEXT,
  author_id UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) Video Approvals - Formal approval records
CREATE TABLE public.video_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  video_version_id UUID NOT NULL REFERENCES public.video_versions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  approved_by_client BOOLEAN NOT NULL DEFAULT false,
  client_name TEXT,
  approved_by_user_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- 4) Video Approval Tokens - Unique links for client access
CREATE TABLE public.video_approval_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_hash TEXT,
  client_email TEXT,
  client_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5) Workspace Storage - Track storage usage per workspace
CREATE TABLE public.workspace_storage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  storage_limit_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10GB default for Studio
  base_storage_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10GB
  extra_storage_bytes BIGINT NOT NULL DEFAULT 0,
  stripe_addon_subscription_id TEXT,
  addon_tier TEXT CHECK (addon_tier IN ('50gb', '100gb', '250gb', NULL)),
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6) Video Retention Queue - Automated cleanup scheduling
CREATE TABLE public.video_retention_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  retention_days INTEGER NOT NULL DEFAULT 14,
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'deleted', 'cancelled')),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_video_versions_task ON public.video_versions(task_id);
CREATE INDEX idx_video_versions_workspace ON public.video_versions(workspace_id);
CREATE INDEX idx_video_comments_version ON public.video_comments(video_version_id);
CREATE INDEX idx_video_comments_task ON public.video_comments(task_id);
CREATE INDEX idx_video_comments_status ON public.video_comments(status);
CREATE INDEX idx_video_approvals_task ON public.video_approvals(task_id);
CREATE INDEX idx_video_approval_tokens_token ON public.video_approval_tokens(token);
CREATE INDEX idx_video_approval_tokens_task ON public.video_approval_tokens(task_id);
CREATE INDEX idx_workspace_storage_workspace ON public.workspace_storage(workspace_id);
CREATE INDEX idx_video_retention_scheduled ON public.video_retention_queue(scheduled_deletion_at) WHERE status = 'pending';

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.video_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_approval_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_retention_queue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- video_versions policies
CREATE POLICY "Members can view video versions"
  ON public.video_versions FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Editors can insert video versions"
  ON public.video_versions FOR INSERT
  WITH CHECK (get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor'));

CREATE POLICY "Creator or admin can delete video versions"
  ON public.video_versions FOR DELETE
  USING (uploaded_by = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

-- video_comments policies
CREATE POLICY "Members can view video comments"
  ON public.video_comments FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert video comments"
  ON public.video_comments FOR INSERT
  WITH CHECK (
    is_workspace_member(auth.uid(), workspace_id) AND 
    author_id = auth.uid() AND 
    is_client_comment = false
  );

CREATE POLICY "Members can update comment status"
  ON public.video_comments FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- video_approvals policies
CREATE POLICY "Members can view video approvals"
  ON public.video_approvals FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert video approvals"
  ON public.video_approvals FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- video_approval_tokens policies
CREATE POLICY "Admins can manage approval tokens"
  ON public.video_approval_tokens FOR ALL
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Members can view approval tokens"
  ON public.video_approval_tokens FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

-- workspace_storage policies
CREATE POLICY "Admins can manage workspace storage"
  ON public.workspace_storage FOR ALL
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Members can view workspace storage"
  ON public.workspace_storage FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

-- video_retention_queue policies
CREATE POLICY "Admins can manage retention queue"
  ON public.video_retention_queue FOR ALL
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Members can view retention queue"
  ON public.video_retention_queue FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- SERVICE ROLE POLICIES (for edge functions)
-- ============================================

CREATE POLICY "Service role can manage video versions"
  ON public.video_versions FOR ALL
  USING (is_service_role());

CREATE POLICY "Service role can manage video comments"
  ON public.video_comments FOR ALL
  USING (is_service_role());

CREATE POLICY "Service role can manage video approvals"
  ON public.video_approvals FOR ALL
  USING (is_service_role());

CREATE POLICY "Service role can manage approval tokens"
  ON public.video_approval_tokens FOR ALL
  USING (is_service_role());

CREATE POLICY "Service role can manage workspace storage"
  ON public.workspace_storage FOR ALL
  USING (is_service_role());

CREATE POLICY "Service role can manage retention queue"
  ON public.video_retention_queue FOR ALL
  USING (is_service_role());

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_workspace_storage_updated_at
  BEFORE UPDATE ON public.workspace_storage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.video_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_approvals;

-- ============================================
-- STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-versions', 
  'video-versions', 
  false, 
  5368709120, -- 5GB limit per file
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska']
);

-- Storage policies for video-versions bucket
CREATE POLICY "Workspace members can view videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'video-versions' AND
    EXISTS (
      SELECT 1 FROM public.video_versions vv
      WHERE vv.file_path = name
      AND is_workspace_member(auth.uid(), vv.workspace_id)
    )
  );

CREATE POLICY "Editors can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'video-versions' AND
    (storage.foldername(name))[1] IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id::text = (storage.foldername(name))[1]
      AND get_workspace_role(auth.uid(), w.id) IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can delete videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'video-versions' AND
    EXISTS (
      SELECT 1 FROM public.video_versions vv
      WHERE vv.file_path = name
      AND is_workspace_admin(auth.uid(), vv.workspace_id)
    )
  );

-- Service role full access to video storage
CREATE POLICY "Service role can manage video storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'video-versions' AND is_service_role());