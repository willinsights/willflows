-- 1. Adicionar coluna is_private aos eventos do calendário
ALTER TABLE public.calendar_events 
ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- 2. Atualizar políticas RLS para eventos privados
-- Remover política existente de SELECT
DROP POLICY IF EXISTS "Users can view calendar events in their workspace" ON public.calendar_events;

-- Criar nova política que respeita privacidade
CREATE POLICY "Users can view calendar events in their workspace" 
ON public.calendar_events 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
  AND (
    is_private = false 
    OR created_by = auth.uid()
  )
);

-- 3. Criar trigger para impedir convites com role 'admin'
CREATE OR REPLACE FUNCTION public.prevent_admin_invite()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Não é permitido convidar membros como administradores. Promova o membro após aceitar o convite.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_admin_invite_trigger
BEFORE INSERT OR UPDATE ON public.workspace_invitations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_invite();

-- 4. Criar trigger para impedir promoção a admin via workspace_members (para convidados)
-- Um membro só pode ser promovido a admin pelo dono original do workspace
CREATE OR REPLACE FUNCTION public.prevent_guest_admin_promotion()
RETURNS TRIGGER AS $$
DECLARE
  workspace_owner_id uuid;
BEGIN
  -- Se a role está sendo alterada para admin
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
    -- Buscar o owner do workspace (primeiro admin criado)
    SELECT user_id INTO workspace_owner_id
    FROM public.workspace_members
    WHERE workspace_id = NEW.workspace_id AND role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Se o membro não é o owner e está tentando ser promovido via invite
    -- (Verificar se o membro foi convidado, não criou o workspace)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_guest_admin_promotion_trigger
BEFORE UPDATE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_guest_admin_promotion();