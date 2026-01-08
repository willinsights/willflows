import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const demoClients = [
  { name: 'Hotel Lisboa Palace', company: 'Grupo Pestana', email: 'reservas@lisboapalace.pt', phone: '+351 213 456 789', city: 'Lisboa' },
  { name: 'Ana Silva', company: 'Casamento Silva-Costa', email: 'ana.silva@email.pt', phone: '+351 912 345 678', city: 'Cascais' },
  { name: 'Pedro Costa', company: 'TechCorp Portugal', email: 'pedro.costa@techcorp.pt', phone: '+351 916 789 012', city: 'Porto' },
  { name: 'Resort Algarve', company: 'Vilamoura Hotels', email: 'info@resortalgarve.pt', phone: '+351 289 123 456', city: 'Vilamoura' },
  { name: 'Maria Santos', company: 'Santos & Filhos', email: 'maria@santosefilhos.pt', phone: '+351 934 567 890', city: 'Braga' },
  { name: 'Hotel Porto Bay', company: 'Porto Bay Group', email: 'marketing@portobay.pt', phone: '+351 291 234 567', city: 'Madeira' },
  { name: 'João Ferreira', company: 'Evento Corporate', email: 'joao@eventocorp.pt', phone: '+351 965 432 109', city: 'Coimbra' },
  { name: 'Boutique Sintra', company: 'Heritage Hotels', email: 'sintra@heritage.pt', phone: '+351 219 876 543', city: 'Sintra' },
  { name: 'Rita Oliveira', company: 'Wedding Planner', email: 'rita@weddingpt.pt', phone: '+351 923 456 789', city: 'Évora' },
  { name: 'Sunset Beach Resort', company: 'Grupo Beach', email: 'info@sunsetbeach.pt', phone: '+351 282 345 678', city: 'Lagos' },
];

const projectTypes = ['fotografia', 'video', 'foto_video'] as const;
const projectCategories = ['hotel', 'experiencia', 'evento', 'outro'] as const;
const priorities = ['baixa', 'media', 'alta', 'urgente'] as const;
const phases = ['captacao', 'edicao'] as const;

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export function SeedDemoData() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const seedData = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      // 1. Create clients
      const { data: createdClients, error: clientsError } = await supabase
        .from('clients')
        .insert(
          demoClients.map(c => ({
            ...c,
            workspace_id: currentWorkspace.id,
          }))
        )
        .select();

      if (clientsError) throw clientsError;

      // 2. Get kanban columns
      const { data: columns, error: colError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('phase', { ascending: true })
        .order('position', { ascending: true });

      if (colError) throw colError;

      const captacaoColumns = columns?.filter(c => c.phase === 'captacao') || [];
      const edicaoColumns = columns?.filter(c => c.phase === 'edicao') || [];

      // 3. Create 25 projects
      const projects = [];
      const today = new Date();
      const pastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (let i = 0; i < 25; i++) {
        const client = createdClients![i % createdClients!.length];
        const phase = phases[Math.floor(Math.random() * phases.length)];
        const columns_ = phase === 'captacao' ? captacaoColumns : edicaoColumns;
        const column = columns_[Math.floor(Math.random() * columns_.length)];
        
        const shootDate = randomDate(pastMonth, nextMonth);
        const deliveryDate = new Date(shootDate.getTime() + (7 + Math.random() * 14) * 24 * 60 * 60 * 1000);

        projects.push({
          name: `Projeto ${client.name} - ${i + 1}`,
          workspace_id: currentWorkspace.id,
          client_id: client.id,
          type: projectTypes[Math.floor(Math.random() * projectTypes.length)],
          category: projectCategories[Math.floor(Math.random() * projectCategories.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          current_phase: phase,
          captacao_column_id: phase === 'captacao' ? column.id : captacaoColumns[captacaoColumns.length - 1]?.id,
          edicao_column_id: phase === 'edicao' ? column.id : null,
          shoot_date: formatDate(shootDate),
          delivery_date: formatDate(deliveryDate),
          city: client.city,
        });
      }

      const { data: createdProjects, error: projectsError } = await supabase
        .from('projects')
        .insert(projects)
        .select();

      if (projectsError) throw projectsError;

      // 4. Create 200 tasks distributed among projects
      const tasks = [];
      const taskTitles = [
        'Preparar equipamento', 'Confirmar horário com cliente', 'Scouting do local',
        'Captação de imagens', 'Edição de vídeo', 'Color grading', 'Entrega para revisão',
        'Ajustes finais', 'Exportar versão final', 'Upload para cloud',
        'Enviar preview ao cliente', 'Fazer backup', 'Organizar arquivos',
        'Selecionar melhores takes', 'Adicionar áudio/música', 'Criar thumbnail',
        'Preparar contrato', 'Confirmar pagamento', 'Enviar fatura', 'Follow-up cliente',
      ];

      for (let i = 0; i < 200; i++) {
        const project = createdProjects![i % createdProjects!.length];
        const dueDate = randomDate(pastMonth, nextMonth);
        
        tasks.push({
          title: taskTitles[Math.floor(Math.random() * taskTitles.length)] + ` #${i + 1}`,
          workspace_id: currentWorkspace.id,
          project_id: project.id,
          phase: project.current_phase,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          due_date: formatDate(dueDate),
          is_completed: Math.random() > 0.7,
          position: i,
        });
      }

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasks);

      if (tasksError) throw tasksError;

      toast({
        title: 'Dados de demonstração criados!',
        description: `10 clientes, 25 projetos e 200 tarefas foram adicionados.`,
      });
    } catch (error: any) {
      console.error('Error seeding data:', error);
      toast({
        title: 'Erro ao criar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearDemoData = async () => {
    if (!currentWorkspace) return;

    setClearLoading(true);
    try {
      // Delete in order: tasks -> projects -> clients
      await supabase
        .from('tasks')
        .delete()
        .eq('workspace_id', currentWorkspace.id);

      await supabase
        .from('projects')
        .delete()
        .eq('workspace_id', currentWorkspace.id);

      await supabase
        .from('clients')
        .delete()
        .eq('workspace_id', currentWorkspace.id);

      toast({
        title: 'Dados removidos',
        description: 'Todos os dados de demonstração foram removidos.',
      });
    } catch (error: any) {
      console.error('Error clearing data:', error);
      toast({
        title: 'Erro ao remover dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={seedData}
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Database className="h-4 w-4" />
        )}
        Popular Demo
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="icon" className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover todos os clientes, projetos e tarefas do workspace.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearDemoData}
              className="bg-destructive text-destructive-foreground"
              disabled={clearLoading}
            >
              {clearLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
