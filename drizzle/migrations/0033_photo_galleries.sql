CREATE TABLE public.photo_galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Galeria',
  share_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24),'hex'),
  token_expires_at timestamptz,
  included_count integer NOT NULL DEFAULT 0 CHECK (included_count >= 0),
  extra_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (extra_price >= 0),
  watermark_enabled boolean NOT NULL DEFAULT false,
  watermark_text text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','shared','selection_submitted','delivered')),
  selection_submitted_at timestamptz,
  client_name text,
  client_note text,
  extras_count integer NOT NULL DEFAULT 0,
  extras_amount numeric(10,2) NOT NULL DEFAULT 0,
  extras_paid_at timestamptz,
  extras_added_to_project_at timestamptz,
  delivered_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.photo_galleries(project_id);

CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.photo_galleries(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  preview_path text NOT NULL,
  original_path text,
  width integer, height integer,
  size_bytes bigint NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_favorite boolean NOT NULL DEFAULT false,
  favorited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.gallery_photos(gallery_id, position);

CREATE TABLE public.photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
  gallery_id uuid NOT NULL REFERENCES public.photo_galleries(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.photo_comments(id) ON DELETE CASCADE,
  x numeric(6,3) CHECK (x BETWEEN 0 AND 100),
  y numeric(6,3) CHECK (y BETWEEN 0 AND 100),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  is_client boolean NOT NULL DEFAULT false,
  author_name text,
  created_by uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.photo_comments(photo_id);

CREATE TABLE public.shot_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  notes text,
  position integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  done_by uuid,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.shot_list_items(project_id, position);

CREATE TABLE public.shot_list_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_galleries, public.gallery_photos, public.photo_comments, public.shot_list_items, public.shot_list_templates TO authenticated;
GRANT ALL ON public.photo_galleries, public.gallery_photos, public.photo_comments, public.shot_list_items, public.shot_list_templates TO service_role;

ALTER TABLE public.photo_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_list_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view galleries" ON public.photo_galleries FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Editors manage galleries" ON public.photo_galleries FOR ALL TO authenticated
  USING (public.can_edit_project(auth.uid(), project_id))
  WITH CHECK (public.can_edit_project(auth.uid(), project_id) AND workspace_id = (SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id));

CREATE POLICY "Members view gallery photos" ON public.gallery_photos FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Editors manage gallery photos" ON public.gallery_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.photo_galleries g WHERE g.id = gallery_id AND public.can_edit_project(auth.uid(), g.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.photo_galleries g WHERE g.id = gallery_id AND g.workspace_id = gallery_photos.workspace_id AND public.can_edit_project(auth.uid(), g.project_id)));

CREATE POLICY "Members view photo comments" ON public.photo_comments FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Editors manage photo comments" ON public.photo_comments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.photo_galleries g WHERE g.id = gallery_id AND public.can_edit_project(auth.uid(), g.project_id)))
  WITH CHECK (is_client = false AND created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.photo_galleries g WHERE g.id = gallery_id AND g.workspace_id = photo_comments.workspace_id AND public.can_edit_project(auth.uid(), g.project_id)));

CREATE POLICY "Members view shot list" ON public.shot_list_items FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members tick shot list" ON public.shot_list_items FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Editors insert shot list" ON public.shot_list_items FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_project(auth.uid(), project_id) AND workspace_id = (SELECT p.workspace_id FROM public.projects p WHERE p.id = project_id));
CREATE POLICY "Editors delete shot list" ON public.shot_list_items FOR DELETE TO authenticated USING (public.can_edit_project(auth.uid(), project_id));

CREATE POLICY "Members view shot templates" ON public.shot_list_templates FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members manage shot templates" ON public.shot_list_templates FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Add paid extras to project's agreed value exactly once
CREATE OR REPLACE FUNCTION public.add_gallery_extras_to_project(p_gallery_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.photo_galleries;
BEGIN
  SELECT * INTO g FROM public.photo_galleries WHERE id = p_gallery_id FOR UPDATE;
  IF g.id IS NULL OR NOT public.can_edit_project(auth.uid(), g.project_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF g.extras_added_to_project_at IS NOT NULL THEN RAISE EXCEPTION 'Already added'; END IF;
  IF g.extras_amount <= 0 THEN RAISE EXCEPTION 'No extras'; END IF;
  UPDATE public.projects SET agreed_value = COALESCE(agreed_value,0) + g.extras_amount WHERE id = g.project_id;
  UPDATE public.photo_galleries SET extras_added_to_project_at = now() WHERE id = g.id;
  RETURN g.extras_amount;
END $$;
REVOKE ALL ON FUNCTION public.add_gallery_extras_to_project(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_gallery_extras_to_project(uuid) TO authenticated;

-- Storage access for studio members (folder 1 = workspace id)
CREATE POLICY "Workspace members read gallery files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gallery-photos' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Workspace members upload gallery files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery-photos' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Workspace members delete gallery files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery-photos' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));