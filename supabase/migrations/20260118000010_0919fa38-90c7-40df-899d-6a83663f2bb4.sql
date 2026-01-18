-- Corrigir search_path nas funções criadas
CREATE OR REPLACE FUNCTION public.prevent_admin_invite()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Não é permitido convidar membros como administradores. Promova o membro após aceitar o convite.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_guest_admin_promotion()
RETURNS TRIGGER AS $$
DECLARE
  workspace_owner_id uuid;
BEGIN
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
    SELECT user_id INTO workspace_owner_id
    FROM public.workspace_members
    WHERE workspace_id = NEW.workspace_id AND role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF EXISTS (
      SELECT 1 FROM public.workspace_invitations 
      WHERE email = (SELECT email FROM public.profiles WHERE id = NEW.user_id)
      AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Membros convidados não podem ser promovidos a administradores.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;