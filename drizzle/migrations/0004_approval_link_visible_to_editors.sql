CREATE OR REPLACE FUNCTION public.get_video_approval_token_secret(p_token_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_id uuid;
  v_token text;
  v_created_by uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT workspace_id, token, created_by
    INTO v_workspace_id, v_token, v_created_by
    FROM public.video_approval_tokens
   WHERE id = p_token_id;

  IF v_workspace_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (
    auth.uid() = v_created_by
    OR public.is_workspace_admin(auth.uid(), v_workspace_id)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = v_workspace_id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('edicao','gestao')
    )
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'video_approval_token_revealed', 'video_approval_token', p_token_id,
          jsonb_build_object('workspace_id', v_workspace_id));

  RETURN v_token;
END;
$function$;