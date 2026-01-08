import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
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
  { name: 'Hotel Lisboa Palace', company: 'Grupo Pestana', email: 'reservas@lisboapalace.pt', phone: '+351 213 456 789', city: 'Lisboa', nif: '501234567' },
  { name: 'Ana Silva', company: 'Casamento Silva-Costa', email: 'ana.silva@email.pt', phone: '+351 912 345 678', city: 'Cascais', nif: '234567890' },
  { name: 'Pedro Costa', company: 'TechCorp Portugal', email: 'pedro.costa@techcorp.pt', phone: '+351 916 789 012', city: 'Porto', nif: '509876543' },
  { name: 'Resort Algarve Premium', company: 'Vilamoura Hotels', email: 'info@resortalgarve.pt', phone: '+351 289 123 456', city: 'Vilamoura', nif: '503456789' },
  { name: 'Maria Santos', company: 'Santos & Filhos Lda', email: 'maria@santosefilhos.pt', phone: '+351 934 567 890', city: 'Braga', nif: '507654321' },
  { name: 'Hotel Porto Bay Flores', company: 'Porto Bay Group', email: 'marketing@portobay.pt', phone: '+351 291 234 567', city: 'Funchal', nif: '502345678' },
  { name: 'João Ferreira', company: 'Evento Corporate SA', email: 'joao@eventocorp.pt', phone: '+351 965 432 109', city: 'Coimbra', nif: '508765432' },
  { name: 'Boutique Hotel Sintra', company: 'Heritage Hotels', email: 'sintra@heritage.pt', phone: '+351 219 876 543', city: 'Sintra', nif: '504567890' },
  { name: 'Rita Oliveira', company: 'Wedding Dreams PT', email: 'rita@weddingpt.pt', phone: '+351 923 456 789', city: 'Évora', nif: '506543210' },
  { name: 'Sunset Beach Resort', company: 'Grupo Beach Hotels', email: 'info@sunsetbeach.pt', phone: '+351 282 345 678', city: 'Lagos', nif: '505432109' },
];

const projectNames = [
  'Sessão Fotográfica Exterior', 'Vídeo Institucional', 'Cobertura de Evento',
  'Tour Virtual 360°', 'Drone Aéreo', 'Making Of', 'Vídeo Promocional',
  'Fotos de Interiores', 'Teaser Redes Sociais', 'Documentário',
  'Sessão de Produto', 'Vídeo Casamento', 'Ensaio Lifestyle',
  'Fotos Gastronómicas', 'Vídeo Experiência', 'Retrato Corporativo',
  'Timelapse', 'Vídeo Testemunho', 'Sessão Noturna', 'Conteúdo Instagram',
  'Vídeo de Lançamento', 'Fotos Arquitetura', 'Evento Corporativo',
  'Aniversário de Empresa', 'Workshop Fotográfico'
];

const projectTypes = ['fotografia', 'video', 'foto_video'] as const;
const projectCategories = ['hotel', 'experiencia', 'evento', 'outro'] as const;
const priorities = ['baixa', 'media', 'alta', 'urgente'] as const;
const itemTypes = ['projeto_captacao', 'projeto_edicao', 'projeto_completo', 'reuniao'] as const;

const taskTemplates = {
  captacao: [
    'Preparar equipamento',
    'Confirmar horário com cliente',
    'Scouting do local',
    'Check-in no local',
    'Captação principal',
    'Captação B-roll',
    'Backup de arquivos',
    'Confirmar materiais captados',
  ],
  edicao: [
    'Organizar ficheiros',
    'Seleção de takes',
    'Montagem inicial',
    'Color grading',
    'Adicionar áudio/música',
    'Legendas/grafismos',
    'Revisão interna',
    'Enviar para aprovação',
    'Ajustes finais',
    'Exportar versão final',
    'Upload para entrega',
  ]
};

const checklistItems = [
  'Cartões SD formatados',
  'Baterias carregadas',
  'Lentes limpas',
  'Tripé verificado',
  'Drone calibrado',
  'Iluminação testada',
  'Contrato assinado',
  'Briefing confirmado',
];

const mediaLinkTypes = ['youtube', 'vimeo', 'drive', 'frameio', 'nas', 'outro'] as const;

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDateTime(date: Date) {
  return date.toISOString();
}

function randomTime() {
  const hours = 8 + Math.floor(Math.random() * 10);
  const minutes = Math.random() > 0.5 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

export function SeedDemoData() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const seedData = async () => {
    if (!currentWorkspace || !user) return;

    setLoading(true);
    try {
      // 0. Clear existing demo data first to avoid duplicates
      console.log('Clearing existing data before seeding...');
      
      // Get existing projects to clean related data
      const { data: existingProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', currentWorkspace.id);
      
      if (existingProjects && existingProjects.length > 0) {
        const projectIds = existingProjects.map(p => p.id);
        await supabase.from('project_media_links').delete().in('project_id', projectIds);
        await supabase.from('project_team').delete().in('project_id', projectIds);
      }

      // Get existing tasks to clean related data
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('workspace_id', currentWorkspace.id);
      
      if (existingTasks && existingTasks.length > 0) {
        const taskIds = existingTasks.map(t => t.id);
        await supabase.from('task_checklists').delete().in('task_id', taskIds);
        await supabase.from('task_assignees').delete().in('task_id', taskIds);
        await supabase.from('task_comments').delete().in('task_id', taskIds);
        await supabase.from('task_attachments').delete().in('task_id', taskIds);
      }

      // Delete main tables in order
      await supabase.from('calendar_events').delete().eq('workspace_id', currentWorkspace.id);
      await supabase.from('payments').delete().eq('workspace_id', currentWorkspace.id);
      await supabase.from('tasks').delete().eq('workspace_id', currentWorkspace.id);
      await supabase.from('projects').delete().eq('workspace_id', currentWorkspace.id);
      await supabase.from('clients').delete().eq('workspace_id', currentWorkspace.id);
      
      console.log('Existing data cleared successfully');

      // 1. Create clients
      const { data: createdClients, error: clientsError } = await supabase
        .from('clients')
        .insert(
          demoClients.map(c => ({
            ...c,
            workspace_id: currentWorkspace.id,
            notes: `Cliente de demonstração - ${c.company}`,
          }))
        )
        .select();

      if (clientsError) throw clientsError;
      console.log('Created clients:', createdClients?.length);

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

      console.log('Columns found:', captacaoColumns.length, 'captacao,', edicaoColumns.length, 'edicao');

      // 3. Create 25 projects with varied data using 2026 dates
      const projects = [];
      // Use 2026 dates for demo data
      const today = new Date('2026-01-08');
      const pastMonth = new Date('2025-12-01');
      const nextTwoMonths = new Date('2026-03-15');

      for (let i = 0; i < 25; i++) {
        const client = createdClients![i % createdClients!.length];
        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        
        // Determine phase based on item type
        let phase: 'captacao' | 'edicao' = 'captacao';
        if (itemType === 'projeto_edicao') {
          phase = 'edicao';
        } else if (itemType === 'projeto_completo' && Math.random() > 0.5) {
          phase = 'edicao';
        }

        const columns_ = phase === 'captacao' ? captacaoColumns : edicaoColumns;
        const columnIndex = Math.floor(Math.random() * columns_.length);
        const column = columns_[columnIndex];
        
        const shootDate = randomDate(pastMonth, nextTwoMonths);
        const deliveryDate = new Date(shootDate.getTime() + (7 + Math.random() * 21) * 24 * 60 * 60 * 1000);
        
        const agreedValue = Math.round((500 + Math.random() * 4500) / 50) * 50;
        const custoCaptacao = Math.round((50 + Math.random() * 300) / 10) * 10;
        const custoEdicao = Math.round((100 + Math.random() * 500) / 10) * 10;

        const isDelivered = column?.is_final && Math.random() > 0.3;

        projects.push({
          name: `${projectNames[i]} - ${client.name.split(' ')[0]}`,
          project_code: `WF-2026-${String(i + 1).padStart(3, '0')}`,
          workspace_id: currentWorkspace.id,
          client_id: client.id,
          created_by: user.id,
          type: projectTypes[Math.floor(Math.random() * projectTypes.length)],
          category: projectCategories[Math.floor(Math.random() * projectCategories.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          item_type: itemType,
          current_phase: phase,
          captacao_column_id: phase === 'captacao' ? column?.id : captacaoColumns[captacaoColumns.length - 1]?.id,
          edicao_column_id: phase === 'edicao' ? column?.id : null,
          shoot_date: formatDate(shootDate),
          shoot_start_time: randomTime(),
          shoot_end_time: randomTime(),
          delivery_date: formatDate(deliveryDate),
          city: client.city,
          agreed_value: agreedValue,
          custo_captacao: custoCaptacao,
          custo_edicao: custoEdicao,
          notes: `Projeto de demonstração para ${client.name}. Tipo: ${itemType}`,
          is_delivered: isDelivered,
          delivered_at: isDelivered ? formatDateTime(deliveryDate) : null,
          google_meet_url: itemType === 'reuniao' ? `https://meet.google.com/abc-defg-${i}` : null,
        });
      }

      const { data: createdProjects, error: projectsError } = await supabase
        .from('projects')
        .insert(projects)
        .select();

      if (projectsError) throw projectsError;
      console.log('Created projects:', createdProjects?.length);

      // 4. Create tasks for each project
      const allTasks: any[] = [];
      
      for (const project of createdProjects!) {
        const phase = project.current_phase as 'captacao' | 'edicao';
        const templates = taskTemplates[phase];
        const numTasks = 3 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < numTasks; i++) {
          const dueDate = randomDate(new Date(project.shoot_date!), new Date(project.delivery_date!));
          const isCompleted = Math.random() > 0.4;
          
          allTasks.push({
            title: templates[i % templates.length],
            workspace_id: currentWorkspace.id,
            project_id: project.id,
            phase: phase,
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            due_date: formatDate(dueDate),
            is_completed: isCompleted,
            completed_at: isCompleted ? formatDateTime(dueDate) : null,
            position: i,
            created_by: user.id,
          });
        }
      }

      const { data: createdTasks, error: tasksError } = await supabase
        .from('tasks')
        .insert(allTasks)
        .select();

      if (tasksError) throw tasksError;
      console.log('Created tasks:', createdTasks?.length);

      // 5. Create checklists for some tasks
      const allChecklists: any[] = [];
      const tasksWithChecklists = createdTasks!.filter(() => Math.random() > 0.5);

      for (const task of tasksWithChecklists) {
        const numItems = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numItems; i++) {
          const isCompleted = Math.random() > 0.3;
          allChecklists.push({
            task_id: task.id,
            title: checklistItems[i % checklistItems.length],
            position: i,
            is_completed: isCompleted,
            completed_at: isCompleted ? formatDateTime(new Date()) : null,
          });
        }
      }

      if (allChecklists.length > 0) {
        const { error: checklistError } = await supabase
          .from('task_checklists')
          .insert(allChecklists);
        if (checklistError) throw checklistError;
        console.log('Created checklists:', allChecklists.length);
      }

      // 6. Create media links for some projects
      const allMediaLinks: any[] = [];
      const projectsWithLinks = createdProjects!.filter(() => Math.random() > 0.4);

      for (const project of projectsWithLinks) {
        const numLinks = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numLinks; i++) {
          const linkType = mediaLinkTypes[Math.floor(Math.random() * mediaLinkTypes.length)];
          let url = '';
          switch (linkType) {
            case 'youtube':
              url = `https://youtube.com/watch?v=demo${project.id.slice(0, 8)}`;
              break;
            case 'vimeo':
              url = `https://vimeo.com/${Math.floor(Math.random() * 999999999)}`;
              break;
            case 'drive':
              url = `https://drive.google.com/drive/folders/${project.id.slice(0, 16)}`;
              break;
            case 'frameio':
              url = `https://app.frame.io/reviews/${project.id.slice(0, 8)}`;
              break;
            case 'nas':
              url = `\\\\nas.studio\\projetos\\${project.project_code}`;
              break;
            default:
              url = `https://wetransfer.com/downloads/${project.id.slice(0, 12)}`;
          }

          allMediaLinks.push({
            project_id: project.id,
            link_type: linkType,
            title: `${linkType.charAt(0).toUpperCase() + linkType.slice(1)} - ${project.name.split(' ')[0]}`,
            url: url,
          });
        }
      }

      if (allMediaLinks.length > 0) {
        const { error: linksError } = await supabase
          .from('project_media_links')
          .insert(allMediaLinks);
        if (linksError) throw linksError;
        console.log('Created media links:', allMediaLinks.length);
      }

      // 7. Create payments
      const allPayments: any[] = [];
      
      for (const project of createdProjects!) {
        // Client payment (receivable)
        const isPaid = project.is_delivered && Math.random() > 0.3;
        allPayments.push({
          workspace_id: currentWorkspace.id,
          project_id: project.id,
          client_id: project.client_id,
          is_receivable: true,
          amount: project.agreed_value || 0,
          status: isPaid ? 'pago' : (Math.random() > 0.7 ? 'vencido' : 'pendente'),
          due_date: project.delivery_date,
          paid_at: isPaid ? formatDateTime(new Date(project.delivery_date!)) : null,
          description: `Pagamento do projeto: ${project.name}`,
          invoice_number: isPaid ? `FAT-2026-${String(allPayments.length + 1).padStart(4, '0')}` : null,
        });

        // Freelancer costs (payable) - for some projects
        if (Math.random() > 0.5) {
          const freelancerPaid = Math.random() > 0.4;
          allPayments.push({
            workspace_id: currentWorkspace.id,
            project_id: project.id,
            is_receivable: false,
            amount: (project.custo_captacao || 0) + (project.custo_edicao || 0),
            status: freelancerPaid ? 'pago' : 'pendente',
            due_date: project.delivery_date,
            paid_at: freelancerPaid ? formatDateTime(new Date()) : null,
            description: `Custos de produção: ${project.name}`,
            freelancer_name: ['Miguel Fotógrafo', 'Sara Editor', 'João Drone', 'Ana Produção'][Math.floor(Math.random() * 4)],
          });
        }
      }

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(allPayments);

      if (paymentsError) throw paymentsError;
      console.log('Created payments:', allPayments.length);

      // 8. Create calendar events
      const allEvents: any[] = [];
      
      for (const project of createdProjects!) {
        // Shoot event
        if (project.shoot_date) {
          const shootStart = new Date(project.shoot_date);
          shootStart.setHours(parseInt(project.shoot_start_time?.split(':')[0] || '10'));
          
          const shootEnd = new Date(shootStart);
          shootEnd.setHours(shootEnd.getHours() + 3 + Math.floor(Math.random() * 4));

          allEvents.push({
            workspace_id: currentWorkspace.id,
            project_id: project.id,
            title: `📸 Captação: ${project.name.split(' - ')[0]}`,
            event_type: 'captacao',
            start_at: formatDateTime(shootStart),
            end_at: formatDateTime(shootEnd),
            location: project.city,
            created_by: user.id,
          });
        }

        // Delivery deadline event
        if (project.delivery_date) {
          const deliveryDate = new Date(project.delivery_date);
          deliveryDate.setHours(18);

          allEvents.push({
            workspace_id: currentWorkspace.id,
            project_id: project.id,
            title: `📦 Entrega: ${project.name.split(' - ')[0]}`,
            event_type: 'entrega',
            start_at: formatDateTime(deliveryDate),
            all_day: true,
            created_by: user.id,
          });
        }

        // Meeting for reuniao type
        if (project.item_type === 'reuniao') {
          const meetingDate = randomDate(today, nextTwoMonths);
          meetingDate.setHours(10 + Math.floor(Math.random() * 6));

          allEvents.push({
            workspace_id: currentWorkspace.id,
            project_id: project.id,
            title: `🎥 Reunião: ${project.name.split(' - ')[0]}`,
            event_type: 'reuniao',
            start_at: formatDateTime(meetingDate),
            end_at: formatDateTime(new Date(meetingDate.getTime() + 60 * 60 * 1000)),
            video_call_url: project.google_meet_url,
            created_by: user.id,
          });
        }
      }

      // Add some standalone meetings
      for (let i = 0; i < 5; i++) {
        const meetingDate = randomDate(today, nextTwoMonths);
        meetingDate.setHours(9 + Math.floor(Math.random() * 8));

        allEvents.push({
          workspace_id: currentWorkspace.id,
          title: ['Reunião de equipa', 'Briefing novo cliente', 'Review mensal', 'Planeamento semanal', 'Formação interna'][i],
          event_type: 'reuniao',
          start_at: formatDateTime(meetingDate),
          end_at: formatDateTime(new Date(meetingDate.getTime() + 60 * 60 * 1000)),
          video_call_url: `https://meet.google.com/team-meet-${i}`,
          created_by: user.id,
        });
      }

      const { error: eventsError } = await supabase
        .from('calendar_events')
        .insert(allEvents);

      if (eventsError) throw eventsError;
      console.log('Created calendar events:', allEvents.length);

      toast({
        title: 'Dados de demonstração criados com sucesso!',
        description: `${createdClients?.length} clientes, ${createdProjects?.length} projetos, ${createdTasks?.length} tarefas, ${allChecklists.length} checklists, ${allMediaLinks.length} links, ${allPayments.length} pagamentos e ${allEvents.length} eventos.`,
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
      // Get all tasks to delete their related data
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('workspace_id', currentWorkspace.id);
      
      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        await supabase.from('task_checklists').delete().in('task_id', taskIds);
        await supabase.from('task_assignees').delete().in('task_id', taskIds);
        await supabase.from('task_comments').delete().in('task_id', taskIds);
        await supabase.from('task_attachments').delete().in('task_id', taskIds);
      }

      // Get all projects to delete their related data
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', currentWorkspace.id);
      
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        await supabase.from('project_media_links').delete().in('project_id', projectIds);
        await supabase.from('project_team').delete().in('project_id', projectIds);
      }

      // Delete main tables in order of dependencies
      await supabase.from('calendar_events').delete().eq('workspace_id', currentWorkspace.id);
      await supabase.from('payments').delete().eq('workspace_id', currentWorkspace.id);
      await supabase.from('tasks').delete().eq('workspace_id', currentWorkspace.id);
      await supabase.from('projects').delete().eq('workspace_id', currentWorkspace.id);
      await supabase.from('clients').delete().eq('workspace_id', currentWorkspace.id);

      toast({
        title: 'Dados removidos',
        description: 'Todos os dados de demonstração foram removidos com sucesso.',
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
        {loading ? 'A criar dados...' : 'Popular Demo'}
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
              Esta ação irá remover todos os clientes, projetos, tarefas, pagamentos e eventos do workspace.
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
