-- Apagar subscriptions de utilizadores que já não existem
DELETE FROM user_subscriptions
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Trigger para limpar subscriptions quando um perfil é apagado
CREATE OR REPLACE FUNCTION public.cleanup_user_subscriptions()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_subscriptions WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS before_profile_delete ON profiles;
CREATE TRIGGER before_profile_delete
BEFORE DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_subscriptions();