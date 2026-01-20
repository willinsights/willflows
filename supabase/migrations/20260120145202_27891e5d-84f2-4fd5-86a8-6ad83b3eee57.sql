-- Permitir que membros saiam do workspace (update próprio registo para inactive)
CREATE POLICY "Members can leave workspace"
  ON public.workspace_members 
  FOR UPDATE
  USING (
    auth.uid() = user_id  -- Utilizador só pode atualizar o próprio registo
  )
  WITH CHECK (
    auth.uid() = user_id
    AND is_active = false  -- Só pode definir como inativo (sair)
  );