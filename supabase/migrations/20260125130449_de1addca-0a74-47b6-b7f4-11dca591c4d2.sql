-- Create contract status enum
CREATE TYPE public.contract_status AS ENUM (
  'draft',      -- Rascunho
  'sent',       -- Enviado ao cliente
  'viewed',     -- Cliente abriu o link
  'signed',     -- Assinado
  'expired',    -- Prazo expirado
  'cancelled'   -- Cancelado
);

-- Create contract_templates table
CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  placeholders JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Status
  status contract_status NOT NULL DEFAULT 'draft',
  
  -- Dates
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Signature
  signature_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_signature_data TEXT,
  client_signed_name TEXT,
  client_signed_ip TEXT,
  client_signed_user_agent TEXT,
  
  -- Value and terms
  total_value NUMERIC,
  payment_terms TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contract_views table for tracking
CREATE TABLE public.contract_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_views ENABLE ROW LEVEL SECURITY;

-- RLS for contract_templates
CREATE POLICY "Members can view contract templates"
ON public.contract_templates FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admin and editor can manage templates"
ON public.contract_templates FOR ALL
USING (get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor'));

-- RLS for contracts
CREATE POLICY "Members can view contracts"
ON public.contracts FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admin and editor can manage contracts"
ON public.contracts FOR ALL
USING (get_workspace_role(auth.uid(), workspace_id) IN ('admin', 'editor'));

-- Public access for signature page (by token)
CREATE POLICY "Public can view contract by token"
ON public.contracts FOR SELECT
USING (signature_token IS NOT NULL);

CREATE POLICY "Public can update contract signature"
ON public.contracts FOR UPDATE
USING (signature_token IS NOT NULL AND status IN ('sent', 'viewed'))
WITH CHECK (signature_token IS NOT NULL);

-- RLS for contract_views
CREATE POLICY "Anyone can insert contract views"
ON public.contract_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Members can view contract views"
ON public.contract_views FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.contracts c
  WHERE c.id = contract_id
  AND is_workspace_member(auth.uid(), c.workspace_id)
));

-- Indexes
CREATE INDEX idx_contract_templates_workspace ON public.contract_templates(workspace_id);
CREATE INDEX idx_contracts_workspace ON public.contracts(workspace_id);
CREATE INDEX idx_contracts_client ON public.contracts(client_id);
CREATE INDEX idx_contracts_project ON public.contracts(project_id);
CREATE INDEX idx_contracts_token ON public.contracts(signature_token);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contract_views_contract ON public.contract_views(contract_id);

-- Trigger for updated_at
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();