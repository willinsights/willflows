-- Tabela para armazenar evidências fiscais de invoices Stripe
CREATE TABLE public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  
  -- Stripe IDs
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_charge_id TEXT,
  
  -- Valores (em cêntimos)
  amount_total INTEGER NOT NULL,
  amount_subtotal INTEGER NOT NULL,
  amount_tax INTEGER DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  
  -- Informação fiscal
  customer_country TEXT,
  tax_rate_percent NUMERIC(5,2),
  tax_type TEXT,
  customer_tax_id TEXT,
  customer_tax_id_valid BOOLEAN,
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  
  -- URLs
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  
  -- Metadata
  billing_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_subscription_invoices_user ON subscription_invoices(user_id);
CREATE INDEX idx_subscription_invoices_workspace ON subscription_invoices(workspace_id);
CREATE INDEX idx_subscription_invoices_stripe_customer ON subscription_invoices(stripe_customer_id);
CREATE INDEX idx_subscription_invoices_status ON subscription_invoices(status);

-- RLS
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON subscription_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON subscription_invoices FOR ALL
  USING (public.is_service_role());