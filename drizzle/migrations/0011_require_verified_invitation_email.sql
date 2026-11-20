CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE
 v_invitation RECORD;
 v_user_id uuid;
 v_user_email text;
 v_user_email_hash text;
 v_existing_member uuid;
 v_new_member_id uuid;
 v_token_hash text;
BEGIN
 v_user_id := auth.uid();
 IF v_user_id IS NULL THEN
  RETURN json_build_object('success',false,'error','User not authenticated');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=v_user_id) THEN
  RETURN json_build_object('success',false,'error','Sessão inválida. Por favor, faça logout e entre novamente.');
 END IF;
 SELECT email INTO v_user_email FROM auth.users WHERE id=v_user_id AND email_confirmed_at IS NOT NULL;
 IF v_user_email IS NULL THEN
  RETURN json_build_object('success',false,'error','Confirme o seu email antes de aceitar o convite.');
 END IF;
 v_user_email_hash := public.hash_email(v_user_email);
 v_token_hash := public.hash_invitation_token(p_token);
 SELECT wi.*,w.name AS workspace_name INTO v_invitation
 FROM public.workspace_invitations wi JOIN public.workspaces w ON w.id=wi.workspace_id
 WHERE wi.token_hash=v_token_hash AND wi.accepted_at IS NULL AND wi.expires_at>now();
 IF v_invitation IS NULL THEN
  RETURN json_build_object('success',false,'error','Convite inválido ou expirado');
 END IF;
 IF v_invitation.email_hash IS DISTINCT FROM v_user_email_hash THEN
  RETURN json_build_object('success',false,'error','Este convite foi enviado para outro email');
 END IF;
 SELECT id INTO v_existing_member FROM public.workspace_members WHERE workspace_id=v_invitation.workspace_id AND user_id=v_user_id;
 IF v_existing_member IS NOT NULL THEN
  UPDATE public.workspace_invitations SET accepted_at=now() WHERE id=v_invitation.id;
  RETURN json_build_object('success',true,'message','Já és membro deste workspace','workspace_id',v_invitation.workspace_id);
 END IF;
 INSERT INTO public.workspace_members(workspace_id,user_id,role,joined_at,is_active)
 VALUES(v_invitation.workspace_id,v_user_id,v_invitation.role,now(),true) RETURNING id INTO v_new_member_id;
 UPDATE public.workspace_invitations SET accepted_at=now() WHERE id=v_invitation.id;
 RETURN json_build_object('success',true,'message','Convite aceite com sucesso','workspace_id',v_invitation.workspace_id,'role',v_invitation.role::text);
END;
$function$;