ALTER TABLE public.gallery_photos ADD COLUMN storage_provider text NOT NULL DEFAULT 'supabase' CHECK (storage_provider IN ('supabase','r2'));

REVOKE INSERT, UPDATE, DELETE ON public.gallery_photos FROM authenticated;

CREATE OR REPLACE FUNCTION public.gallery_photo_quota() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d bigint; ws uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN d := NEW.size_bytes; ws := NEW.workspace_id;
  ELSIF TG_OP = 'DELETE' THEN d := -OLD.size_bytes; ws := OLD.workspace_id;
  ELSE d := NEW.size_bytes - OLD.size_bytes; ws := NEW.workspace_id; END IF;
  IF d <> 0 THEN
    UPDATE public.workspace_storage SET storage_used_bytes = GREATEST(0, storage_used_bytes + d), updated_at = now() WHERE workspace_id = ws;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER gallery_photo_quota AFTER INSERT OR DELETE OR UPDATE OF size_bytes ON public.gallery_photos FOR EACH ROW EXECUTE FUNCTION public.gallery_photo_quota();

UPDATE public.workspace_storage s SET storage_used_bytes = s.storage_used_bytes + t.b, updated_at = now()
FROM (SELECT workspace_id, sum(size_bytes) b FROM public.gallery_photos GROUP BY 1) t WHERE t.workspace_id = s.workspace_id;

CREATE OR REPLACE FUNCTION public.can_access_feature(p_workspace_id uuid, p_feature text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_plan TEXT; v_status TEXT; v_trial_end timestamptz; v_feature_available BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = p_workspace_id AND user_id = auth.uid() AND is_active = true) THEN RETURN FALSE; END IF;
  SELECT COALESCE(subscription_plan::text, 'starter'), subscription_status, trial_ends_at INTO v_plan, v_status, v_trial_end FROM workspaces WHERE id = p_workspace_id;
  IF v_status = 'trialing' AND v_trial_end > now() THEN v_plan := 'studio';
  ELSIF v_status IS NULL OR v_status NOT IN ('active') THEN v_plan := 'starter'; END IF;
  CASE p_feature
    WHEN 'chat','exportExcel','exportPdf','googleCalendar','googleMeet','reportsAdvanced','templates','crmComplete' THEN v_feature_available := v_plan IN ('pro','studio');
    WHEN 'videoApproval','frameio','automations','api','permissions','photoGalleries' THEN v_feature_available := v_plan = 'studio';
    WHEN 'kanban','crmBasic','calendar','mediaHub','reportsBasic','financialReports' THEN v_feature_available := TRUE;
    ELSE v_feature_available := FALSE;
  END CASE;
  RETURN v_feature_available;
END; $function$;

DROP POLICY "Editors manage galleries" ON public.photo_galleries;
CREATE POLICY "Editors manage galleries" ON public.photo_galleries FOR ALL TO authenticated
  USING (public.can_edit_project(auth.uid(), project_id))
  WITH CHECK (public.can_edit_project(auth.uid(), project_id) AND public.can_access_feature(workspace_id, 'photoGalleries') AND workspace_id = (SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id));

CREATE OR REPLACE FUNCTION public.notify_gallery_event(p_gallery uuid, p_title text, p_message text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.photo_galleries;
BEGIN
  SELECT * INTO g FROM public.photo_galleries WHERE id = p_gallery;
  IF g.id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (workspace_id, user_id, type, title, message, entity_type, entity_id)
  SELECT g.workspace_id, m.user_id, 'photo_gallery', p_title, p_message, 'project', g.project_id
  FROM public.workspace_members m
  WHERE m.workspace_id = g.workspace_id AND m.is_active AND public.has_workspace_permission(m.user_id, g.workspace_id, 'projects.edit');
END $$;
REVOKE ALL ON FUNCTION public.notify_gallery_event(uuid, text, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gallery_submit_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'selection_submitted' AND OLD.status IS DISTINCT FROM 'selection_submitted' THEN
    PERFORM public.notify_gallery_event(NEW.id, 'Seleção de fotos recebida',
      COALESCE(NEW.client_name, 'O cliente') || ' enviou a seleção em "' || NEW.title || '"' ||
      CASE WHEN NEW.extras_count > 0 THEN ' com ' || NEW.extras_count || ' extra(s)' ELSE '' END || '.');
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER gallery_submit_notify AFTER UPDATE OF status ON public.photo_galleries FOR EACH ROW EXECUTE FUNCTION public.gallery_submit_notify();

CREATE OR REPLACE FUNCTION public.photo_comment_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_client THEN
    PERFORM public.notify_gallery_event(NEW.gallery_id, 'Novo comentário numa foto',
      COALESCE(NEW.author_name, 'O cliente') || ': ' || left(NEW.body, 120));
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER photo_comment_notify AFTER INSERT ON public.photo_comments FOR EACH ROW EXECUTE FUNCTION public.photo_comment_notify();