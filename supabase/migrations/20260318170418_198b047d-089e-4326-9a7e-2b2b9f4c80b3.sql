
-- Table to track payment alert preferences and state
CREATE TABLE public.payment_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- 'upcoming_3d', 'upcoming_7d', 'overdue', 'overdue_7d', 'overdue_30d'
  notified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_id, alert_type)
);

ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payment alerts"
  ON public.payment_alerts FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members with finance permission can manage alerts"
  ON public.payment_alerts FOR ALL TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

-- Index for quick lookup
CREATE INDEX idx_payment_alerts_payment ON public.payment_alerts(payment_id);
CREATE INDEX idx_payment_alerts_workspace ON public.payment_alerts(workspace_id);
