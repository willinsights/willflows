-- ===============================================
-- Security Fix: Promo Codes & Contracts Exposure
-- ===============================================

-- ==============================================
-- FIX 1: PROMO CODES - Create secure RPC function
-- ==============================================

-- Create a secure RPC function to validate promo codes
-- This returns only the validation result, not the actual code data
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
BEGIN
  -- Validate input
  IF _code IS NULL OR trim(_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'empty_code');
  END IF;

  -- Look up the promo code (case-insensitive)
  SELECT id, trial_days, max_uses, used_count, expires_at, is_active
  INTO v_promo
  FROM public.promo_codes
  WHERE UPPER(code) = UPPER(trim(_code));

  -- Code not found
  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  -- Check if active
  IF NOT v_promo.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'inactive');
  END IF;

  -- Check expiration
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  -- Check usage limits
  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'max_uses_reached');
  END IF;

  -- Code is valid - return only necessary info
  RETURN jsonb_build_object(
    'valid', true,
    'trial_days', v_promo.trial_days
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO anon;


-- ==============================================
-- FIX 2: CONTRACTS - Fix overly permissive policy
-- ==============================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view contract by token" ON public.contracts;

-- Create a secure RPC function to fetch contract by token
-- This validates the token and returns contract data only if token matches
CREATE OR REPLACE FUNCTION public.get_contract_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  -- Validate input
  IF _token IS NULL OR trim(_token) = '' THEN
    RETURN jsonb_build_object('found', false, 'error', 'invalid_token');
  END IF;

  -- Look up the contract by exact token match
  SELECT 
    c.id,
    c.workspace_id,
    c.client_id,
    c.project_id,
    c.title,
    c.content,
    c.status,
    c.sent_at,
    c.viewed_at,
    c.signed_at,
    c.expires_at,
    c.signature_token,
    c.client_signature_data,
    c.client_signed_name,
    c.total_value,
    c.payment_terms,
    c.created_at,
    c.updated_at,
    cl.id as client_id_ref,
    cl.name as client_name,
    cl.company as client_company,
    cl.email as client_email
  INTO v_contract
  FROM public.contracts c
  LEFT JOIN public.clients cl ON cl.id = c.client_id
  WHERE c.signature_token = _token;

  -- Contract not found
  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_found');
  END IF;

  -- Return contract data
  RETURN jsonb_build_object(
    'found', true,
    'contract', jsonb_build_object(
      'id', v_contract.id,
      'workspace_id', v_contract.workspace_id,
      'client_id', v_contract.client_id,
      'project_id', v_contract.project_id,
      'title', v_contract.title,
      'content', v_contract.content,
      'status', v_contract.status,
      'sent_at', v_contract.sent_at,
      'viewed_at', v_contract.viewed_at,
      'signed_at', v_contract.signed_at,
      'expires_at', v_contract.expires_at,
      'signature_token', v_contract.signature_token,
      'client_signature_data', v_contract.client_signature_data,
      'client_signed_name', v_contract.client_signed_name,
      'total_value', v_contract.total_value,
      'payment_terms', v_contract.payment_terms,
      'created_at', v_contract.created_at,
      'updated_at', v_contract.updated_at
    ),
    'client', jsonb_build_object(
      'id', v_contract.client_id_ref,
      'name', v_contract.client_name,
      'company', v_contract.client_company,
      'email', v_contract.client_email
    )
  );
END;
$$;

-- Grant execute permission to anon (for public signing page)
GRANT EXECUTE ON FUNCTION public.get_contract_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_contract_by_token(text) TO authenticated;

-- Create RPC function to sign contract (with validation)
CREATE OR REPLACE FUNCTION public.sign_contract_public(_token text, _signer_name text, _signature_data text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  -- Validate inputs
  IF _token IS NULL OR trim(_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;
  
  IF _signer_name IS NULL OR trim(_signer_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'signer_name_required');
  END IF;
  
  IF _signature_data IS NULL OR trim(_signature_data) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'signature_required');
  END IF;

  -- Find contract by exact token match
  SELECT id, status, expires_at
  INTO v_contract
  FROM public.contracts
  WHERE signature_token = _token;

  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'contract_not_found');
  END IF;

  -- Check if already signed
  IF v_contract.status = 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_signed');
  END IF;

  -- Check if cancelled
  IF v_contract.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'contract_cancelled');
  END IF;

  -- Check if expired
  IF v_contract.expires_at IS NOT NULL AND v_contract.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'contract_expired');
  END IF;

  -- Update contract with signature
  UPDATE public.contracts
  SET 
    status = 'signed',
    signed_at = now(),
    client_signed_name = trim(_signer_name),
    client_signature_data = _signature_data
  WHERE id = v_contract.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission to anon
GRANT EXECUTE ON FUNCTION public.sign_contract_public(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.sign_contract_public(text, text, text) TO authenticated;

-- Create RPC function to mark contract as viewed (with validation)
CREATE OR REPLACE FUNCTION public.mark_contract_viewed(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  -- Validate input
  IF _token IS NULL OR trim(_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  -- Find contract by exact token match
  SELECT id, status
  INTO v_contract
  FROM public.contracts
  WHERE signature_token = _token;

  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Only update if status is 'sent' (first view)
  IF v_contract.status = 'sent' THEN
    UPDATE public.contracts
    SET 
      status = 'viewed',
      viewed_at = now()
    WHERE id = v_contract.id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_contract_viewed(text) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_contract_viewed(text) TO authenticated;

-- Drop overly permissive UPDATE policy
DROP POLICY IF EXISTS "Public can update contract signature" ON public.contracts;
DROP POLICY IF EXISTS "Public can sign contract with valid token" ON public.contracts;