
CREATE TABLE public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  codigo text,
  projeto text NOT NULL,
  cliente text,
  tipo text,
  data_entrega date,
  captacao text,
  edicao text,
  versoes integer NOT NULL DEFAULT 1,
  receita numeric NOT NULL DEFAULT 0,
  custo_colab numeric NOT NULL DEFAULT 0,
  extras numeric NOT NULL DEFAULT 0,
  custo numeric NOT NULL DEFAULT 0,
  lucro numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Entregue',
  mes text,
  ano integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gravacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  data date NOT NULL,
  local text,
  cliente text,
  ponto_encontro text,
  producoes text[] NOT NULL DEFAULT '{}',
  colaboradores text[] NOT NULL DEFAULT '{}',
  ano integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.estudio_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  data date NOT NULL,
  colaborador text NOT NULL,
  tipo text NOT NULL DEFAULT 'diaria',
  valor numeric NOT NULL DEFAULT 0,
  notas text,
  ano integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.trabalhos_complementares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  data date NOT NULL,
  descricao text NOT NULL,
  cliente text,
  valor numeric NOT NULL DEFAULT 0,
  ano integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cambio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  de text NOT NULL,
  para text NOT NULL,
  taxa numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, de, para)
);

CREATE INDEX idx_projetos_ws_ano ON public.projetos(workspace_id, ano);
CREATE INDEX idx_gravacoes_ws_ano ON public.gravacoes(workspace_id, ano);
CREATE INDEX idx_estudio_diarias_ws_ano ON public.estudio_diarias(workspace_id, ano);
CREATE INDEX idx_trab_compl_ws_ano ON public.trabalhos_complementares(workspace_id, ano);

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

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gravacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudio_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabalhos_complementares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projetos_select" ON public.projetos FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "projetos_write" ON public.projetos FOR ALL TO authenticated
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'));

CREATE POLICY "gravacoes_select" ON public.gravacoes FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "gravacoes_write" ON public.gravacoes FOR ALL TO authenticated
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'));

CREATE POLICY "estudio_diarias_select" ON public.estudio_diarias FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "estudio_diarias_write" ON public.estudio_diarias FOR ALL TO authenticated
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'));

CREATE POLICY "trabalhos_complementares_select" ON public.trabalhos_complementares FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "trabalhos_complementares_write" ON public.trabalhos_complementares FOR ALL TO authenticated
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'));

CREATE POLICY "cambio_select" ON public.cambio FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "cambio_write" ON public.cambio FOR ALL TO authenticated
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'))
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'payments.manage'));

CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gravacoes_updated_at BEFORE UPDATE ON public.gravacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_estudio_diarias_updated_at BEFORE UPDATE ON public.estudio_diarias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trabalhos_complementares_updated_at BEFORE UPDATE ON public.trabalhos_complementares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cambio_updated_at BEFORE UPDATE ON public.cambio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
