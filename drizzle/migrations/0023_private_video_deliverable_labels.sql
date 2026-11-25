CREATE TABLE willflow_video_private.deliverables (
  version_id uuid PRIMARY KEY,
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 120),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON willflow_video_private.deliverables FROM PUBLIC, anon, authenticated;
GRANT ALL ON willflow_video_private.deliverables TO service_role;
ALTER TABLE willflow_video_private.deliverables ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.private_video_set_deliverable(p_version uuid, p_user uuid, p_label text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v willflow_video_private.versions;
BEGIN
  PERFORM willflow_video_private.service_check();
  SELECT * INTO v FROM willflow_video_private.versions WHERE id = p_version;
  IF NOT FOUND OR NOT willflow_video_private.permitted(v, p_user, NULL) OR NOT willflow_video_private.editor(v.workspace_id, p_user)
     OR p_label IS NULL OR length(btrim(p_label)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Forbidden deliverable';
  END IF;
  INSERT INTO willflow_video_private.deliverables(version_id, label) VALUES (p_version, btrim(p_label))
  ON CONFLICT (version_id) DO UPDATE SET label = excluded.label, updated_at = now();
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.private_video_deliverable_labels(p_versions uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM willflow_video_private.service_check();
  RETURN coalesce((SELECT jsonb_object_agg(version_id, label) FROM willflow_video_private.deliverables WHERE version_id = ANY(p_versions)), '{}'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.private_video_set_deliverable(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.private_video_deliverable_labels(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.private_video_set_deliverable(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.private_video_deliverable_labels(uuid[]) TO service_role;