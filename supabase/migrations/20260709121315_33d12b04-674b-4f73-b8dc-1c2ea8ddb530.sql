
-- Fix is_workspace_member argument order (user_id first, then workspace_id)
DROP POLICY IF EXISTS "Members can view closings" ON public.closings;
DROP POLICY IF EXISTS "Members can create closings" ON public.closings;
DROP POLICY IF EXISTS "Members can update closings" ON public.closings;
DROP POLICY IF EXISTS "Members can delete closings" ON public.closings;

CREATE POLICY "Members can view closings" ON public.closings FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create closings" ON public.closings FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "Members can update closings" ON public.closings FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete closings" ON public.closings FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can view closing items" ON public.closing_items;
DROP POLICY IF EXISTS "Members can insert closing items" ON public.closing_items;
DROP POLICY IF EXISTS "Members can update closing items" ON public.closing_items;
DROP POLICY IF EXISTS "Members can delete closing items" ON public.closing_items;

CREATE POLICY "Members can view closing items" ON public.closing_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.is_workspace_member(auth.uid(), c.workspace_id)));
CREATE POLICY "Members can insert closing items" ON public.closing_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.is_workspace_member(auth.uid(), c.workspace_id)));
CREATE POLICY "Members can update closing items" ON public.closing_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.is_workspace_member(auth.uid(), c.workspace_id)));
CREATE POLICY "Members can delete closing items" ON public.closing_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.is_workspace_member(auth.uid(), c.workspace_id)));
