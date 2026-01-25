-- Create ENUM for lead status
CREATE TYPE public.lead_status AS ENUM (
  'novo',
  'contactado',
  'qualificado',
  'proposta',
  'negociacao',
  'ganho',
  'perdido'
);

-- Add lead tracking columns to clients table
ALTER TABLE public.clients 
ADD COLUMN lead_status public.lead_status DEFAULT 'novo',
ADD COLUMN lead_source TEXT,
ADD COLUMN estimated_value NUMERIC,
ADD COLUMN converted_at TIMESTAMPTZ,
ADD COLUMN lost_reason TEXT,
ADD COLUMN next_follow_up TIMESTAMPTZ,
ADD COLUMN last_contact_at TIMESTAMPTZ;

-- Create index for lead status queries
CREATE INDEX idx_clients_lead_status ON public.clients(lead_status) WHERE is_active = true;
CREATE INDEX idx_clients_workspace_lead_status ON public.clients(workspace_id, lead_status) WHERE is_active = true;

-- Update RLS policies to allow lead management
CREATE POLICY "Members with editing rights can update lead status"
ON public.clients
FOR UPDATE
USING (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'captacao'::app_role]))
WITH CHECK (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'captacao'::app_role]));