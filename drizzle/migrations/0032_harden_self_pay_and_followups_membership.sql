CREATE OR REPLACE FUNCTION public.guard_project_team_self_pay()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.payment_amount IS NOT DISTINCT FROM OLD.payment_amount
     AND NEW.cost_amount IS NOT DISTINCT FROM OLD.cost_amount THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.payment_amount IS NULL AND NEW.cost_amount IS NULL THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Not allowed to set your own pay' USING ERRCODE = '42501';
END $function$;

DROP POLICY IF EXISTS "Users can view their followups" ON public.followups;
CREATE POLICY "Users can view their followups" ON public.followups FOR SELECT TO authenticated
USING (((created_by = auth.uid()) OR (assigned_to = auth.uid())) AND EXISTS (
  SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = followups.workspace_id AND wm.user_id = auth.uid() AND wm.is_active = true));

DROP POLICY IF EXISTS "Users can update their followups" ON public.followups;
CREATE POLICY "Users can update their followups" ON public.followups FOR UPDATE TO authenticated
USING (((created_by = auth.uid()) OR (assigned_to = auth.uid())) AND EXISTS (
  SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = followups.workspace_id AND wm.user_id = auth.uid() AND wm.is_active = true));