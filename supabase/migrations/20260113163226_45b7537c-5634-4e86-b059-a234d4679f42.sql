-- Trigger to prevent projeto_completo from advancing captacao -> edicao without completing captação phase
CREATE OR REPLACE FUNCTION public.prevent_captacao_to_edicao_without_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_can_deliver jsonb;
BEGIN
  -- Only check when current_phase changes from captacao to edicao
  IF OLD.current_phase = 'captacao' 
     AND NEW.current_phase = 'edicao' 
     AND COALESCE(NEW.item_type, 'projeto_completo') = 'projeto_completo' THEN
    
    -- Validate using existing function
    v_can_deliver := public.can_deliver_project(NEW.id, 'captacao');
    
    IF NOT (v_can_deliver->>'can_deliver')::boolean THEN
      RAISE EXCEPTION 'CHECKLIST_INCOMPLETE: %', v_can_deliver->>'reason'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_captacao_to_edicao_trigger ON public.projects;
CREATE TRIGGER prevent_captacao_to_edicao_trigger
  BEFORE UPDATE OF current_phase ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_captacao_to_edicao_without_completion();

-- Also create trigger for prevent_invalid_delivery (blocking direct is_delivered updates)
DROP TRIGGER IF EXISTS prevent_invalid_delivery_trigger ON public.projects;
CREATE TRIGGER prevent_invalid_delivery_trigger
  BEFORE UPDATE OF is_delivered ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_invalid_delivery();