-- Remove redundant trigger (trigger_prevent_invalid_delivery)
-- The more specific prevent_invalid_delivery_trigger already handles this validation
DROP TRIGGER IF EXISTS trigger_prevent_invalid_delivery ON public.projects;