-- Corrigir convites beta que não foram marcados como usados
-- Utilizadores que criaram conta mas o convite ficou com used_at = NULL
UPDATE beta_invite_tokens bit
SET 
  used_at = p.created_at,
  used_by = p.id
FROM profiles p
WHERE LOWER(bit.email) = LOWER(p.email)
  AND bit.used_at IS NULL;