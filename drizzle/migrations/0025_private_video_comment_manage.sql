ALTER TABLE willflow_video_private.comments
 ADD COLUMN IF NOT EXISTS parent_id uuid,
 ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
 ADD COLUMN IF NOT EXISTS resolved_by text,
 ADD COLUMN IF NOT EXISTS edited_at timestamptz,
 ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.private_video_comment_manage(p_op text, p_version uuid, p_comment uuid DEFAULT NULL, p_request uuid DEFAULT NULL, p_user uuid DEFAULT NULL, p_digest text DEFAULT NULL, p_body text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v willflow_video_private.versions; c willflow_video_private.comments; ed boolean; who text;
BEGIN
 PERFORM willflow_video_private.service_check(); PERFORM pg_advisory_xact_lock(742019,1);
 IF (p_user IS NULL) = (p_digest IS NULL) OR p_op NOT IN ('edit','delete','resolve','unresolve') THEN RAISE EXCEPTION 'Invalid';END IF;
 SELECT * INTO v FROM willflow_video_private.versions WHERE id=p_version FOR UPDATE;
 IF NOT FOUND OR NOT willflow_video_private.permitted(v,p_user,p_digest) THEN RAISE EXCEPTION 'Forbidden';END IF;
 IF p_user IS NOT NULL THEN
  SELECT * INTO c FROM willflow_video_private.comments WHERE id=p_comment AND version_id=v.id AND deleted_at IS NULL FOR UPDATE;
 ELSE
  SELECT * INTO c FROM willflow_video_private.comments WHERE request_id=p_request AND version_id=v.id AND digest=p_digest AND deleted_at IS NULL FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing';END IF;
 who := coalesce(p_user::text,p_digest); ed := p_user IS NOT NULL AND willflow_video_private.editor(v.workspace_id,p_user);
 IF p_op IN ('edit','delete') AND EXISTS(SELECT 1 FROM willflow_video_private.approvals WHERE version_id=v.id) THEN RAISE EXCEPTION 'Approved';END IF;
 IF p_op='edit' THEN
  IF c.digest<>who OR p_body IS NULL OR length(btrim(p_body))=0 OR length(p_body)>5000 THEN RAISE EXCEPTION 'Forbidden';END IF;
  UPDATE willflow_video_private.comments SET body=p_body, edited_at=now() WHERE id=c.id;
 ELSIF p_op='delete' THEN
  IF c.digest<>who AND NOT ed THEN RAISE EXCEPTION 'Forbidden';END IF;
  UPDATE willflow_video_private.comments SET deleted_at=now() WHERE id=c.id OR parent_id=c.id;
 ELSE
  IF NOT ed THEN RAISE EXCEPTION 'Forbidden';END IF;
  UPDATE willflow_video_private.comments SET resolved_at=CASE WHEN p_op='resolve' THEN now() END, resolved_by=CASE WHEN p_op='resolve' THEN p_user::text END WHERE id=c.id;
 END IF;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.private_video_comment_reply(p_request uuid, p_version uuid, p_parent uuid, p_user uuid, p_body text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v willflow_video_private.versions; par willflow_video_private.comments; nm text;
BEGIN
 PERFORM willflow_video_private.service_check(); PERFORM pg_advisory_xact_lock(742019,1);
 SELECT * INTO v FROM willflow_video_private.versions WHERE id=p_version FOR UPDATE;
 IF NOT FOUND OR p_user IS NULL OR NOT willflow_video_private.permitted(v,p_user,NULL) OR p_request IS NULL OR p_body IS NULL OR length(btrim(p_body))=0 OR length(p_body)>5000 THEN RAISE EXCEPTION 'Forbidden';END IF;
 SELECT * INTO par FROM willflow_video_private.comments WHERE id=p_parent AND version_id=v.id AND parent_id IS NULL AND deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing';END IF;
 SELECT left(coalesce(nullif(full_name,''),'Equipe'),120) INTO nm FROM public.profiles WHERE id=p_user;
 INSERT INTO willflow_video_private.comments(id,request_id,version_id,digest,name,body,timestamp_seconds,created_at,parent_id)
  VALUES(gen_random_uuid(),p_request,v.id,p_user::text,coalesce(nm,'Equipe'),p_body,par.timestamp_seconds,now(),par.id) ON CONFLICT(request_id) DO NOTHING;
 RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.private_video_comment_manage(text,uuid,uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.private_video_comment_reply(uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.private_video_comment_manage(text,uuid,uuid,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.private_video_comment_reply(uuid,uuid,uuid,uuid,text) TO service_role;