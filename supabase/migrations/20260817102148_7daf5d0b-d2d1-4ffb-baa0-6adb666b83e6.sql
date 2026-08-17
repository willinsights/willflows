-- 1) Fix swapped arguments in has_workspace_permission calls
DROP POLICY IF EXISTS cambio_write ON public.cambio;
CREATE POLICY cambio_write ON public.cambio FOR ALL TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

DROP POLICY IF EXISTS projetos_write ON public.projetos;
CREATE POLICY projetos_write ON public.projetos FOR ALL TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

DROP POLICY IF EXISTS gravacoes_write ON public.gravacoes;
CREATE POLICY gravacoes_write ON public.gravacoes FOR ALL TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

DROP POLICY IF EXISTS estudio_diarias_write ON public.estudio_diarias;
CREATE POLICY estudio_diarias_write ON public.estudio_diarias FOR ALL TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

DROP POLICY IF EXISTS trabalhos_complementares_write ON public.trabalhos_complementares;
CREATE POLICY trabalhos_complementares_write ON public.trabalhos_complementares FOR ALL TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

-- 2) video_approval_tokens: no table-wide SELECT; admins get column-scoped reads (token excluded)
REVOKE SELECT ON public.video_approval_tokens FROM authenticated, anon;
REVOKE SELECT (token) ON public.video_approval_tokens FROM authenticated, anon;
GRANT SELECT (id, task_id, project_id, workspace_id, token_hash, client_email, client_name, expires_at, is_active, created_by, created_at)
  ON public.video_approval_tokens TO authenticated;

DROP POLICY IF EXISTS "Admins can manage approval tokens" ON public.video_approval_tokens;
CREATE POLICY "Admins can read approval token metadata" ON public.video_approval_tokens FOR SELECT TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins can create approval tokens" ON public.video_approval_tokens FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins can update approval tokens" ON public.video_approval_tokens FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins can delete approval tokens" ON public.video_approval_tokens FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- 3) workspace_invitations: admins read metadata only, never the raw token
REVOKE SELECT ON public.workspace_invitations FROM authenticated, anon;
REVOKE SELECT (token) ON public.workspace_invitations FROM authenticated, anon;
GRANT SELECT (id, workspace_id, email, email_masked, email_hash, token_hash, role, invited_by, expires_at, accepted_at, created_at)
  ON public.workspace_invitations TO authenticated;

DROP POLICY IF EXISTS "Admins can view all workspace invitations" ON public.workspace_invitations;
CREATE POLICY "Admins can view invitation metadata" ON public.workspace_invitations FOR SELECT TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

GRANT ALL ON public.video_approval_tokens TO service_role;
GRANT ALL ON public.workspace_invitations TO service_role;