GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT ALL ON public.projetos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gravacoes TO authenticated;
GRANT ALL ON public.gravacoes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudio_diarias TO authenticated;
GRANT ALL ON public.estudio_diarias TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trabalhos_complementares TO authenticated;
GRANT ALL ON public.trabalhos_complementares TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cambio TO authenticated;
GRANT ALL ON public.cambio TO service_role;