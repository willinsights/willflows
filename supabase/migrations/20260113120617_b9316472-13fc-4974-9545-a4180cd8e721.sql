-- Drop existing table if exists (to recreate with correct structure)
DROP TABLE IF EXISTS public.project_templates CASCADE;

-- Create project templates table
CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT DEFAULT 'projeto_completo',
  default_priority TEXT DEFAULT 'media',
  task_templates JSONB DEFAULT '[]'::jsonb,
  checklist_templates JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'foto_video',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates in their workspace"
  ON public.project_templates FOR SELECT
  USING (
    workspace_id IS NULL OR
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Admins can manage templates"
  ON public.project_templates FOR ALL
  USING (
    workspace_id IS NOT NULL AND
    public.is_workspace_admin(auth.uid(), workspace_id)
  );

-- Create trigger for updated_at
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system templates (workspace_id = NULL means system-wide)
INSERT INTO public.project_templates (workspace_id, name, description, item_type, type, is_default, task_templates, checklist_templates) VALUES
  (NULL, 'Sessão Fotográfica', 'Template para sessões de fotografia simples', 'projeto_captacao', 'fotografia', true, 
   '[{"title": "Preparar equipamento", "phase": "captacao"}, {"title": "Realizar sessão", "phase": "captacao"}, {"title": "Backup de fotos", "phase": "captacao"}, {"title": "Selecionar melhores fotos", "phase": "edicao"}]'::jsonb,
   '[{"title": "Verificar bateria e cartões"}, {"title": "Confirmar local e hora"}, {"title": "Entregar fotos selecionadas"}]'::jsonb),
   
  (NULL, 'Vídeo Promocional', 'Template para produção de vídeos promocionais', 'projeto_completo', 'video', true,
   '[{"title": "Pré-produção e planeamento", "phase": "captacao"}, {"title": "Filmagem", "phase": "captacao"}, {"title": "Edição do vídeo", "phase": "edicao"}, {"title": "Revisão com cliente", "phase": "edicao"}, {"title": "Ajustes finais", "phase": "edicao"}]'::jsonb,
   '[{"title": "Script aprovado"}, {"title": "Locação confirmada"}, {"title": "Equipamento preparado"}, {"title": "Primeira versão entregue"}, {"title": "Versão final aprovada"}]'::jsonb),

  (NULL, 'Evento', 'Template para cobertura de eventos', 'projeto_completo', 'foto_video', true,
   '[{"title": "Reunião de briefing", "phase": "captacao"}, {"title": "Cobertura do evento", "phase": "captacao"}, {"title": "Edição de fotos", "phase": "edicao"}, {"title": "Edição de vídeo highlights", "phase": "edicao"}]'::jsonb,
   '[{"title": "Cronograma do evento recebido"}, {"title": "Áreas de interesse definidas"}, {"title": "Galeria entregue"}, {"title": "Vídeo highlights entregue"}]'::jsonb),

  (NULL, 'Ensaio Completo', 'Template para ensaio com foto e vídeo', 'projeto_completo', 'foto_video', true,
   '[{"title": "Definir conceito e referências", "phase": "captacao"}, {"title": "Preparar cenário", "phase": "captacao"}, {"title": "Executar sessão", "phase": "captacao"}, {"title": "Tratamento de fotos", "phase": "edicao"}, {"title": "Edição de vídeo making-of", "phase": "edicao"}]'::jsonb,
   '[{"title": "Moodboard aprovado"}, {"title": "Figurinos definidos"}, {"title": "Fotos tratadas"}, {"title": "Making-of editado"}]'::jsonb);