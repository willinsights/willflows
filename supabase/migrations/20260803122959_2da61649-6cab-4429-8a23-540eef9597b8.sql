DROP POLICY IF EXISTS "projetos_select" ON public.projetos;
CREATE POLICY "projetos_select" ON public.projetos
FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "gravacoes_select" ON public.gravacoes;
CREATE POLICY "gravacoes_select" ON public.gravacoes
FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "estudio_diarias_select" ON public.estudio_diarias;
CREATE POLICY "estudio_diarias_select" ON public.estudio_diarias
FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "trabalhos_complementares_select" ON public.trabalhos_complementares;
CREATE POLICY "trabalhos_complementares_select" ON public.trabalhos_complementares
FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "cambio_select" ON public.cambio;
CREATE POLICY "cambio_select" ON public.cambio
FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));