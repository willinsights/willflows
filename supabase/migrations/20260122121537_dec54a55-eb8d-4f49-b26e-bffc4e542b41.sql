-- Fix existing projeto_edicao projects that are incorrectly in captacao phase
UPDATE projects p
SET 
  current_phase = 'edicao',
  edicao_column_id = (
    SELECT id FROM kanban_columns kc
    WHERE kc.workspace_id = p.workspace_id 
      AND kc.phase = 'edicao' 
    ORDER BY kc.position 
    LIMIT 1
  ),
  captacao_column_id = NULL
WHERE item_type = 'projeto_edicao' 
  AND current_phase = 'captacao';

-- Create validation trigger to prevent invalid phase states
CREATE OR REPLACE FUNCTION public.validate_project_phase()
RETURNS TRIGGER AS $$
BEGIN
  -- projeto_edicao can only be in edicao phase
  IF NEW.item_type = 'projeto_edicao' AND NEW.current_phase = 'captacao' THEN
    RAISE EXCEPTION 'Projetos de edição (projeto_edicao) devem estar na fase edição';
  END IF;
  
  -- projeto_captacao can only be in captacao phase (unless delivered)
  IF NEW.item_type = 'projeto_captacao' AND NEW.current_phase = 'edicao' THEN
    RAISE EXCEPTION 'Projetos apenas de captação (projeto_captacao) não podem ir para fase de edição';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_validate_project_phase ON public.projects;

CREATE TRIGGER trigger_validate_project_phase
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_project_phase();