-- Trigger para auto-adicionar geral@willflow.app como super admin no momento do registo
CREATE OR REPLACE FUNCTION public.auto_add_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'geral@willflow.app' THEN
    INSERT INTO public.system_admins (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger na tabela auth.users
CREATE TRIGGER on_geral_willflow_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_super_admin();