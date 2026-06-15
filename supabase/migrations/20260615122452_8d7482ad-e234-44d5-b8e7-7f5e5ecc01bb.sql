
-- Revoke column-level read on signature_token so workspace members can't pull plaintext tokens
REVOKE SELECT (signature_token) ON public.contracts FROM anon, authenticated;

-- Secure RPC: return signature token only to members with contract permission
CREATE OR REPLACE FUNCTION public.get_contract_sign_token(_contract_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT workspace_id, signature_token
    INTO v_workspace_id, v_token
  FROM public.contracts
  WHERE id = _contract_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  IF NOT public.has_workspace_permission(auth.uid(), v_workspace_id, 'visibility.contracts') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contract_sign_token(uuid) TO authenticated;
