
-- Workspace VAT defaults
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS vat_rate_default numeric(5,2) NOT NULL DEFAULT 23.00,
  ADD COLUMN IF NOT EXISTS vat_regime text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS vat_country text NOT NULL DEFAULT 'PT';

-- Client overrides
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS vat_rate_override numeric(5,2),
  ADD COLUMN IF NOT EXISTS vat_regime_override text,
  ADD COLUMN IF NOT EXISTS vat_exempt boolean NOT NULL DEFAULT false;
-- vat_number alias: clients.nif already exists; expose as alias only if not present
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS vat_number text;

-- Invoices: VAT applied snapshot
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS vat_rate_applied numeric(5,2),
  ADD COLUMN IF NOT EXISTS vat_regime_applied text,
  ADD COLUMN IF NOT EXISTS vat_override_reason text,
  ADD COLUMN IF NOT EXISTS vat_amount numeric(12,2);

-- Effective VAT resolver
CREATE OR REPLACE FUNCTION public.get_effective_vat(
  p_workspace_id uuid,
  p_client_id uuid DEFAULT NULL
)
RETURNS TABLE(vat_rate numeric, vat_regime text, source text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  w RECORD;
BEGIN
  SELECT vat_rate_default, vat_regime INTO w
  FROM public.workspaces WHERE id = p_workspace_id;

  IF w IS NULL THEN
    vat_rate := 23.00; vat_regime := 'standard'; source := 'workspace';
    RETURN NEXT; RETURN;
  END IF;

  IF p_client_id IS NOT NULL THEN
    SELECT vat_exempt, vat_rate_override, vat_regime_override INTO c
    FROM public.clients WHERE id = p_client_id AND workspace_id = p_workspace_id;

    IF c.vat_exempt THEN
      vat_rate := 0; vat_regime := 'exempt'; source := 'client';
      RETURN NEXT; RETURN;
    END IF;

    IF c.vat_rate_override IS NOT NULL THEN
      vat_rate := c.vat_rate_override;
      vat_regime := COALESCE(c.vat_regime_override, w.vat_regime);
      source := 'client';
      RETURN NEXT; RETURN;
    END IF;
  END IF;

  vat_rate := w.vat_rate_default;
  vat_regime := w.vat_regime;
  source := 'workspace';
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_vat(uuid, uuid) TO authenticated, service_role;
