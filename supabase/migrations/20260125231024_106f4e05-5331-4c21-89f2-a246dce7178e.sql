-- Constraint para garantir que há pelo menos um identificador
ALTER TABLE project_team 
  ADD CONSTRAINT project_team_member_check 
  CHECK (user_id IS NOT NULL OR invitation_id IS NOT NULL OR is_external = true);

-- Index para performance
CREATE INDEX idx_project_team_invitation ON project_team(invitation_id) WHERE invitation_id IS NOT NULL;

-- Função para converter convite em membro quando aceite
CREATE OR REPLACE FUNCTION convert_invitation_to_member()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Quando convite é aceite (accepted_at passa de NULL para valor)
  IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
    -- Buscar o user_id do perfil pelo email hash
    SELECT p.id INTO v_user_id 
    FROM profiles p 
    WHERE encode(digest(p.email, 'sha256'), 'hex') = NEW.email_hash;
    
    -- Se encontrou o utilizador, actualizar os project_team entries
    IF v_user_id IS NOT NULL THEN
      UPDATE project_team 
      SET user_id = v_user_id,
          invitation_id = NULL
      WHERE invitation_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para auto-converter quando convite é aceite
DROP TRIGGER IF EXISTS on_invitation_accepted ON workspace_invitations;
CREATE TRIGGER on_invitation_accepted
  AFTER UPDATE ON workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION convert_invitation_to_member();