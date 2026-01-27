-- Drop all versions of sign_contract_public first
DROP FUNCTION IF EXISTS public.sign_contract_public(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sign_contract_public(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sign_contract_public(TEXT, TEXT, TEXT, TEXT, TEXT);

-- Recreate with enhanced validation
CREATE OR REPLACE FUNCTION public.sign_contract_public(
  _token TEXT,
  _signer_name TEXT,
  _signature_data TEXT,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id UUID;
  v_contract_status TEXT;
  v_clean_name TEXT;
BEGIN
  -- Input validation - token
  IF _token IS NULL OR trim(_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_required');
  END IF;
  
  -- Clean and validate signer name
  v_clean_name := trim(_signer_name);
  
  IF v_clean_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'signer_name_required');
  END IF;
  
  -- Length validation (2-200 characters)
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'name_length_invalid');
  END IF;
  
  -- Character validation (letters, numbers, spaces, common punctuation only)
  IF v_clean_name !~ '^[A-Za-zÀ-ÿ0-9 .,''''-]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_characters');
  END IF;
  
  -- Signature data validation
  IF _signature_data IS NULL OR trim(_signature_data) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'signature_required');
  END IF;
  
  -- Validate signature data length (base64 image should be reasonable size)
  IF char_length(_signature_data) > 500000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'signature_too_large');
  END IF;

  -- Find contract by token
  SELECT id, status INTO v_contract_id, v_contract_status
  FROM contracts
  WHERE signature_token = _token;
  
  IF v_contract_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;
  
  -- Check if contract is in signable state
  IF v_contract_status NOT IN ('sent') THEN
    IF v_contract_status = 'signed' THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_signed');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'contract_not_signable');
    END IF;
  END IF;
  
  -- Update contract with signature (sanitized values)
  UPDATE contracts
  SET 
    status = 'signed',
    signed_at = now(),
    client_signed_name = v_clean_name,
    client_signature_data = _signature_data,
    client_signed_ip = COALESCE(left(_ip_address, 45), NULL),
    client_signed_user_agent = COALESCE(left(_user_agent, 500), NULL)
  WHERE id = v_contract_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'contract_id', v_contract_id,
    'signed_at', now()
  );
END;
$$;

-- Ensure anon can execute for public signing
GRANT EXECUTE ON FUNCTION public.sign_contract_public(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.sign_contract_public(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;