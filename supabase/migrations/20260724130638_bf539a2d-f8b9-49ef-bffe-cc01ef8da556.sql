
-- Restrict write access on closings/closing_items to users with payments.manage permission
DROP POLICY IF EXISTS "Members can create closings" ON public.closings;
DROP POLICY IF EXISTS "Members can update closings" ON public.closings;
DROP POLICY IF EXISTS "Members can delete closings" ON public.closings;

CREATE POLICY "Payments managers can create closings" ON public.closings FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));
CREATE POLICY "Payments managers can update closings" ON public.closings FOR UPDATE TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));
CREATE POLICY "Payments managers can delete closings" ON public.closings FOR DELETE TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

DROP POLICY IF EXISTS "Members can insert closing items" ON public.closing_items;
DROP POLICY IF EXISTS "Members can update closing items" ON public.closing_items;
DROP POLICY IF EXISTS "Members can delete closing items" ON public.closing_items;

CREATE POLICY "Payments managers can insert closing items" ON public.closing_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.has_workspace_permission(auth.uid(), c.workspace_id, 'payments.manage')));
CREATE POLICY "Payments managers can update closing items" ON public.closing_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.has_workspace_permission(auth.uid(), c.workspace_id, 'payments.manage')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.has_workspace_permission(auth.uid(), c.workspace_id, 'payments.manage')));
CREATE POLICY "Payments managers can delete closing items" ON public.closing_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.closings c WHERE c.id = closing_id AND public.has_workspace_permission(auth.uid(), c.workspace_id, 'payments.manage')));
