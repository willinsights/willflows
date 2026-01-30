-- Sprint 4: Performance indexes for heavy queries
-- Index for projects by workspace and current_phase (Kanban views)
CREATE INDEX IF NOT EXISTS idx_projects_workspace_phase 
  ON public.projects(workspace_id, current_phase);

-- Index for projects by workspace and is_delivered (archive queries)  
CREATE INDEX IF NOT EXISTS idx_projects_workspace_delivered 
  ON public.projects(workspace_id, is_delivered);

-- Index for tasks by project and phase (project detail views)
CREATE INDEX IF NOT EXISTS idx_tasks_project_phase 
  ON public.tasks(project_id, phase);

-- Index for tasks by project with due_date ordering
CREATE INDEX IF NOT EXISTS idx_tasks_project_due 
  ON public.tasks(project_id, due_date);

-- Index for video_versions by task_id (video approval workflows)
CREATE INDEX IF NOT EXISTS idx_video_versions_task 
  ON public.video_versions(task_id);

-- Index for video_versions by workspace (storage calculations)
CREATE INDEX IF NOT EXISTS idx_video_versions_workspace 
  ON public.video_versions(workspace_id);

-- Index for payments by workspace and status (financial reports)
CREATE INDEX IF NOT EXISTS idx_payments_workspace_status 
  ON public.payments(workspace_id, status);

-- Index for payments by workspace and due_date (overdue tracking)
CREATE INDEX IF NOT EXISTS idx_payments_workspace_due 
  ON public.payments(workspace_id, due_date);

-- Index for clients by workspace and lead_status (CRM pipeline)
CREATE INDEX IF NOT EXISTS idx_clients_workspace_lead 
  ON public.clients(workspace_id, lead_status);

-- Index for calendar_events by workspace and date range
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_date 
  ON public.calendar_events(workspace_id, start_at);

-- Index for messages by conversation for chat pagination
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON public.messages(conversation_id, created_at DESC);

-- Index for notifications by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON public.notifications(user_id, read, created_at DESC);

-- Index for activity_log by workspace and date
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_date 
  ON public.activity_log(workspace_id, created_at DESC);

-- Index for admin_audit_log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_date 
  ON public.admin_audit_log(created_at DESC);

-- Index for page_views analytics
CREATE INDEX IF NOT EXISTS idx_page_views_session_date 
  ON public.page_views(session_id, created_at);

-- Index for blog_views analytics
CREATE INDEX IF NOT EXISTS idx_blog_views_post_date 
  ON public.blog_views(post_id, created_at);

-- Index for user_subscriptions lookup (correct column name)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user 
  ON public.user_subscriptions(user_id, subscription_status);