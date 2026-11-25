CREATE OR REPLACE FUNCTION public.private_video_sibling_approval(p_version uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v willflow_video_private.versions; lbl text; r jsonb;
BEGIN
 PERFORM willflow_video_private.service_check();
 SELECT * INTO v FROM willflow_video_private.versions WHERE id=p_version;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT coalesce(nullif(btrim(d.label),''), nullif(btrim(regexp_replace(v.file_name,'\.[^.]+$','')),''), v.file_name) INTO lbl
  FROM (SELECT 1) x LEFT JOIN willflow_video_private.deliverables d ON d.version_id=v.id;
 SELECT jsonb_build_object('version_id',o.id,'name',a.name,'approved_at',a.approved_at) INTO r
  FROM willflow_video_private.versions o
  JOIN willflow_video_private.approvals a ON a.version_id=o.id
  LEFT JOIN willflow_video_private.deliverables d ON d.version_id=o.id
  WHERE o.id<>v.id AND o.workspace_id=v.workspace_id AND o.project_id=v.project_id AND o.task_id IS NOT DISTINCT FROM v.task_id
    AND coalesce(nullif(btrim(d.label),''), nullif(btrim(regexp_replace(o.file_name,'\.[^.]+$','')),''), o.file_name)=lbl
  ORDER BY a.approved_at DESC LIMIT 1;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.private_video_sibling_approval(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.private_video_sibling_approval(uuid) TO service_role;