
-- Invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('rascunho', 'emitida', 'paga', 'vencida', 'cancelada');

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'rascunho',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX idx_invoices_project ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- Updated_at trigger
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Paid_at consistency trigger
CREATE OR REPLACE FUNCTION public.handle_invoice_paid_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paga' AND (OLD.status IS DISTINCT FROM 'paga') THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  ELSIF NEW.status IS DISTINCT FROM 'paga' AND (OLD.status = 'paga') THEN
    NEW.paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_paid_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_paid_at();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices in their workspace"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.view'));

CREATE POLICY "Users can insert invoices in their workspace"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

CREATE POLICY "Users can update invoices in their workspace"
  ON public.invoices FOR UPDATE TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));

CREATE POLICY "Users can delete invoices in their workspace"
  ON public.invoices FOR DELETE TO authenticated
  USING (public.has_workspace_permission(auth.uid(), workspace_id, 'payments.manage'));
