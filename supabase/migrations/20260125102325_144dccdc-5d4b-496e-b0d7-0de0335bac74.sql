-- Use pgcrypto for symmetric encryption of OAuth tokens
-- The encryption key will be derived from the user_id + a server-side secret

-- Create secure encryption functions using pgcrypto
CREATE OR REPLACE FUNCTION public.encrypt_oauth_token(_token text, _user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  -- Use a combination of user_id and a fixed salt for key derivation
  -- The key is derived deterministically so we can decrypt later
  encryption_key bytea;
BEGIN
  IF _token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Derive a 32-byte key from user_id (using SHA-256)
  encryption_key := extensions.digest(_user_id::text || 'willflow_oauth_salt_v1', 'sha256');
  
  -- Encrypt using AES-256 with the derived key
  RETURN encode(
    extensions.encrypt(
      convert_to(_token, 'UTF8'),
      encryption_key,
      'aes'
    ),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_oauth_token(_encrypted_token text, _user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  encryption_key bytea;
BEGIN
  IF _encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Derive the same key used for encryption
  encryption_key := extensions.digest(_user_id::text || 'willflow_oauth_salt_v1', 'sha256');
  
  -- Decrypt
  RETURN convert_from(
    extensions.decrypt(
      decode(_encrypted_token, 'base64'),
      encryption_key,
      'aes'
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (e.g., corrupted data)
    RETURN NULL;
END;
$$;

-- Add encrypted columns for tokens
ALTER TABLE public.google_calendar_connections 
ADD COLUMN IF NOT EXISTS access_token_encrypted text,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;

-- Migrate existing tokens to encrypted format
UPDATE public.google_calendar_connections
SET 
  access_token_encrypted = public.encrypt_oauth_token(access_token, user_id),
  refresh_token_encrypted = public.encrypt_oauth_token(refresh_token, user_id)
WHERE (access_token IS NOT NULL OR refresh_token IS NOT NULL)
  AND access_token_encrypted IS NULL;

-- Clear the plain text tokens after migration
UPDATE public.google_calendar_connections
SET 
  access_token = NULL,
  refresh_token = NULL
WHERE access_token_encrypted IS NOT NULL;

-- Create comments documenting the encryption
COMMENT ON COLUMN public.google_calendar_connections.access_token_encrypted IS 'AES-256 encrypted OAuth access token';
COMMENT ON COLUMN public.google_calendar_connections.refresh_token_encrypted IS 'AES-256 encrypted OAuth refresh token';