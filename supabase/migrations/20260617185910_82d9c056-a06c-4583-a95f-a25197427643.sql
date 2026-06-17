
-- 1) Table
CREATE TABLE public.invoice_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  description   text NOT NULL,
  quantity      numeric(10,2) NOT NULL DEFAULT 1,
  unit_price    numeric(12,2) NOT NULL DEFAULT 0,
  subtotal      numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2) Grants (REQUIRED: PostgREST does not inherit public-schema defaults)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;

-- 3) RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_manage_invoice_items"
  ON public.invoice_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = invoice_items.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = invoice_items.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_workspace_id ON public.invoice_items(workspace_id);

-- 4) Recalculate invoice totals when items change
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_subtotal numeric(12,2);
  v_vat_rate numeric(5,2);
  v_vat_amount numeric(12,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(quantity * unit_price), 0)::numeric(12,2)
    INTO v_subtotal
    FROM public.invoice_items
   WHERE invoice_id = v_invoice_id;

  SELECT COALESCE(vat_rate_applied, tax_rate, 0)::numeric(5,2)
    INTO v_vat_rate
    FROM public.invoices
   WHERE id = v_invoice_id;

  v_vat_amount := ROUND(v_subtotal * COALESCE(v_vat_rate, 0) / 100, 2);

  UPDATE public.invoices SET
    subtotal   = v_subtotal,
    vat_amount = v_vat_amount,
    tax_amount = v_vat_amount,
    total      = v_subtotal + v_vat_amount,
    updated_at = now()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_totals();
