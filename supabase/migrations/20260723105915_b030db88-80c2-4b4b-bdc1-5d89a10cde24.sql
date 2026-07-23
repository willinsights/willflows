
CREATE OR REPLACE FUNCTION public.prevent_conversation_member_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.can_manage_conversation_members(NEW.conversation_id, auth.uid()) THEN
      RAISE EXCEPTION 'Only conversation managers can change member roles'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_conv_member_role_escalation ON public.conversation_members;
CREATE TRIGGER trg_prevent_conv_member_role_escalation
BEFORE UPDATE ON public.conversation_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_conversation_member_role_escalation();
