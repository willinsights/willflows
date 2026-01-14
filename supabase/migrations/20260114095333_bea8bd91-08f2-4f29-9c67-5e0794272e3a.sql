-- Create function to increment promo code usage
CREATE OR REPLACE FUNCTION public.increment_promo_code_usage(code_text TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE promo_codes 
  SET used_count = used_count + 1 
  WHERE code = code_text;
END;
$$;