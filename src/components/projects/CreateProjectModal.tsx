import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Calendar as CalendarIcon, Clock, Link2, X, Check, Users, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/useProjects';
import { useClients, Client } from '@/hooks/useClients';
import { useCategories, Category } from '@/hooks/useCategories';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal';
import { UpgradeAlert } from '@/components/subscription/UpgradeAlert';
import { appToast } from '@/hooks/useAppToast';
import type { KanbanPhase } from '@/hooks/useKanban';

const projectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  item_type: z.enum(['projeto_captacao', 'projeto_edicao', 'projeto_completo', 'reuniao']),
  project_code: z.string().optional(),
  client_id: z.string().optional(),
  custom_category_id: z.string().optional(),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']),
  shoot_date: z.date().optional(),
  shoot_start_time: z.string().optional(),
  shoot_end_time: z.string().optional(),
  delivery_date: z.date().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  agreed_value: z.number().min(0, 'Valor não pode ser negativo').optional(),
  custo_captacao: z.number().min(0, 'Valor não pode ser negativo').optional(),
  custo_edicao: z.number().min(0, 'Valor não pode ser negativo').optional(),
  custos_extras: z.number().min(0, 'Valor não pode ser negativo').optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface MediaLink {
  type: string;
  url: string;
  title?: string;
}

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultColumnId?: string | null;
  phase?: KanbanPhase;
}

const itemTypeLabels = {
  projeto_captacao: 'Projeto de Captação',
  projeto_edicao: 'Projeto de Edição',
  projeto_completo: 'Captação + Edição',
  reuniao: 'Reunião / Compromisso',
};

const linkTypeLabels: Record<string, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  nas: 'NAS',
  frameio: 'Frame.io',
  google_drive: 'Google Drive',
  outro: 'Outro',
};

export function CreateProjectModal({
  open,
  onOpenChange,
  onSuccess,
  defaultColumnId,
  phase,
}: CreateProjectModalProps) {
  const { createProject } = useProjects();
  const { clients, loading: clientsLoading, refresh: refreshClients } = useClients();
  const { categories, loading: categoriesLoading, refresh: refreshCategories } = useCategories();
  const { members: workspaceMembers, loading: membersLoading } = useWorkspaceMembers();
  const { currentWorkspace } = useWorkspace();
  const { 
    checkFeature, 
    upgradeAlert, 
    closeUpgradeAlert, 
    usage, 
    limits,
    currentPlan 
  } = usePlanFeatures();
  const [loading, setLoading] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);
  const [newLinkType, setNewLinkType] = useState('youtube');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [responsaveisCaptacao, setResponsaveisCaptacao] = useState<string[]>([]);
  const [responsaveisEdicao, setResponsaveisEdicao] = useState<string[]>([]);
  

  const currency = currentWorkspace?.currency || 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : 'R$';
  
  // Calculate active projects usage percentage
  const activeProjects = usage?.projects || 0;
  const projectsLimit = limits?.projects || 15;
  const usagePercentage = Math.min((activeProjects / projectsLimit) * 100, 100);
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = activeProjects >= projectsLimit;

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      item_type: 'projeto_completo',
      project_code: '',
      client_id: '',
      custom_category_id: '',
      priority: 'media',
      city: '',
      notes: '',
      agreed_value: 0,
      custo_captacao: 0,
      custo_edicao: 0,
      custos_extras: 0,
    },
  });

  const itemType = form.watch('item_type');
  const isMeeting = itemType === 'reuniao';
  const hasCaptacao = itemType === 'projeto_captacao' || itemType === 'projeto_completo';
  const hasEdicao = itemType === 'projeto_edicao' || itemType === 'projeto_completo';

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset();
      setMediaLinks([]);
      setResponsaveisCaptacao([]);
      setResponsaveisEdicao([]);
      
    }
  }, [open, form]);


  const addMediaLink = () => {
    if (newLinkUrl.trim()) {
      setMediaLinks([...mediaLinks, { type: newLinkType, url: newLinkUrl.trim() }]);
      setNewLinkUrl('');
    }
  };

  const removeMediaLink = (index: number) => {
    setMediaLinks(mediaLinks.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProjectFormData) => {
    // Check project limit before creating
    if (!checkFeature('projects')) {
      return; // UpgradeAlert will be shown automatically
    }
    
    setLoading(true);
    
    // Determine initial phase based on item_type
    let currentPhase: KanbanPhase = 'captacao';
    if (data.item_type === 'projeto_edicao') {
      currentPhase = 'edicao';
    }

    const projectData: any = {
      name: data.name,
      item_type: data.item_type,
      project_code: data.project_code || null,
      type: 'foto_video', // default
      category: 'outro',
      custom_category_id: data.custom_category_id || null,
      priority: data.priority,
      client_id: data.client_id || null,
      shoot_date: data.shoot_date ? format(data.shoot_date, 'yyyy-MM-dd') : null,
      shoot_start_time: data.shoot_start_time || null,
      shoot_end_time: data.shoot_end_time || null,
      delivery_date: data.delivery_date ? format(data.delivery_date, 'yyyy-MM-dd') : null,
      city: data.city || null,
      notes: data.notes || null,
      agreed_value: data.agreed_value || 0,
      custo_captacao: data.custo_captacao || 0,
      custo_edicao: data.custo_edicao || 0,
      custos_extras: data.custos_extras || 0,
      current_phase: currentPhase,
    };

    const project = await createProject(projectData);

    if (project) {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Save media links if any
      if (mediaLinks.length > 0) {
        await supabase.from('project_media_links').insert(
          mediaLinks.map(link => ({
            project_id: project.id,
            link_type: link.type,
            url: link.url,
            title: link.title || null,
          }))
        );
      }

      // Save team members (responsáveis) with auto-calculated payment amounts
      const custoCaptacaoTotal = data.custo_captacao || 0;
      const custoEdicaoTotal = data.custo_edicao || 0;
      const valorPorCaptador = responsaveisCaptacao.length > 0 
        ? custoCaptacaoTotal / responsaveisCaptacao.length 
        : 0;
      const valorPorEditor = responsaveisEdicao.length > 0 
        ? custoEdicaoTotal / responsaveisEdicao.length 
        : 0;
      
      const teamMembers = [
        ...responsaveisCaptacao.map(userId => ({
          project_id: project.id,
          user_id: userId,
          phase: 'captacao' as const,
          payment_amount: valorPorCaptador,
          payment_status: 'pendente' as const,
        })),
        ...responsaveisEdicao.map(userId => ({
          project_id: project.id,
          user_id: userId,
          phase: 'edicao' as const,
          payment_amount: valorPorEditor,
          payment_status: 'pendente' as const,
        })),
      ];

      if (teamMembers.length > 0) {
        await supabase.from('project_team').insert(teamMembers);
      }


      appToast.projectCreated(data.name);
      onSuccess();
    }

    setLoading(false);
  };

  const handleClientCreated = (client: Client) => {
    refreshClients();
    form.setValue('client_id', client.id);
    setCreateClientOpen(false);
  };

  const handleCategoryCreated = (category: Category) => {
    refreshCategories();
    form.setValue('custom_category_id', category.id);
    setCreateCategoryOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">Criar Novo Projeto</DialogTitle>
            
            {/* Active Projects Usage Indicator */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Projetos ativos</span>
                <span className={cn(
                  "font-medium",
                  isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-foreground"
                )}>
                  {activeProjects}/{projectsLimit}
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={cn(
                  "h-2",
                  isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""
                )}
              />
              {isNearLimit && !isAtLimit && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Está a aproximar-se do limite do seu plano
                </p>
              )}
              {isAtLimit && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Limite atingido. Finalize projetos ou faça upgrade.
                </p>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-160px)] sm:max-h-[calc(90vh-120px)] pr-2 sm:pr-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label>Tipo de Item *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(itemTypeLabels).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={form.watch('item_type') === value ? 'default' : 'outline'}
                      className={cn(
                        'h-auto py-3 justify-start',
                        form.watch('item_type') === value && 'gradient-primary'
                      )}
                      onClick={() => form.setValue('item_type', value as any)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Identification Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Identificação
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Projeto *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Hotel Lisboa - Sessão Verão"
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project_code">ID do Projeto</Label>
                    <Input
                      id="project_code"
                      placeholder="Ex: PRJ-2024-001"
                      {...form.register('project_code')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category with + Create option first */}
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={form.watch('custom_category_id') || ''}
                      onValueChange={(value) => {
                        if (value === '__create__') {
                          setCreateCategoryOpen(true);
                        } else {
                          form.setValue('custom_category_id', value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__create__" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Criar categoria
                          </div>
                        </SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client with + Create option first */}
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={form.watch('client_id') || ''}
                      onValueChange={(value) => {
                        if (value === '__create__') {
                          setCreateClientOpen(true);
                        } else {
                          form.setValue('client_id', value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__create__" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Criar cliente
                          </div>
                        </SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={form.watch('priority')}
                      onValueChange={(value) => form.setValue('priority', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Localização</Label>
                    <Input
                      id="city"
                      placeholder="Ex: Lisboa"
                      {...form.register('city')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dates and Times */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Datas e Horários
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {hasCaptacao && (
                    <>
                      <div className="space-y-2">
                        <Label>Data de Captação {hasCaptacao && '*'}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !form.watch('shoot_date') && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {form.watch('shoot_date') ? (
                                format(form.watch('shoot_date')!, 'dd/MM/yyyy', { locale: pt })
                              ) : (
                                <span>Selecionar data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={form.watch('shoot_date')}
                              onSelect={(date) => form.setValue('shoot_date', date)}
                              locale={pt}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Hora Início</Label>
                          <Input
                            type="time"
                            {...form.register('shoot_start_time')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hora Fim</Label>
                          <Input
                            type="time"
                            {...form.register('shoot_end_time')}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {!isMeeting && (
                    <div className="space-y-2">
                      <Label>Data de Entrega *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !form.watch('delivery_date') && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.watch('delivery_date') ? (
                              format(form.watch('delivery_date')!, 'dd/MM/yyyy', { locale: pt })
                            ) : (
                              <span>Selecionar data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.watch('delivery_date')}
                            onSelect={(date) => form.setValue('delivery_date', date)}
                            locale={pt}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>

              {/* Responsáveis Section */}
              {!isMeeting && (hasCaptacao || hasEdicao) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Responsáveis
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {hasCaptacao && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Responsáveis Captação
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal min-h-[40px] h-auto"
                              >
                                {responsaveisCaptacao.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {responsaveisCaptacao.map(userId => {
                                      const member = workspaceMembers.find(m => m.user_id === userId);
                                      return member ? (
                                        <Badge key={userId} variant="secondary" className="text-xs">
                                          {member.full_name || member.email}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Selecionar responsáveis...</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-2" align="start">
                              <div className="space-y-1">
                                {workspaceMembers.length === 0 ? (
                                  <p className="text-sm text-muted-foreground p-2">Nenhum membro encontrado</p>
                                ) : (
                                  workspaceMembers.map(member => (
                                    <div
                                      key={member.user_id}
                                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                                      onClick={() => {
                                        setResponsaveisCaptacao(prev =>
                                          prev.includes(member.user_id)
                                            ? prev.filter(id => id !== member.user_id)
                                            : [...prev, member.user_id]
                                        );
                                      }}
                                    >
                                      <Checkbox
                                        checked={responsaveisCaptacao.includes(member.user_id)}
                                        onCheckedChange={() => {}}
                                        className="pointer-events-none"
                                      />
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                          {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-medium truncate">
                                          {member.full_name || member.email}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {member.role}
                                        </span>
                                      </div>
                                      {responsaveisCaptacao.includes(member.user_id) && (
                                        <Check className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      {hasEdicao && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Responsáveis Edição
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal min-h-[40px] h-auto"
                              >
                                {responsaveisEdicao.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {responsaveisEdicao.map(userId => {
                                      const member = workspaceMembers.find(m => m.user_id === userId);
                                      return member ? (
                                        <Badge key={userId} variant="secondary" className="text-xs">
                                          {member.full_name || member.email}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Selecionar responsáveis...</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-2" align="start">
                              <div className="space-y-1">
                                {workspaceMembers.length === 0 ? (
                                  <p className="text-sm text-muted-foreground p-2">Nenhum membro encontrado</p>
                                ) : (
                                  workspaceMembers.map(member => (
                                    <div
                                      key={member.user_id}
                                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                                      onClick={() => {
                                        setResponsaveisEdicao(prev =>
                                          prev.includes(member.user_id)
                                            ? prev.filter(id => id !== member.user_id)
                                            : [...prev, member.user_id]
                                        );
                                      }}
                                    >
                                      <Checkbox
                                        checked={responsaveisEdicao.includes(member.user_id)}
                                        onCheckedChange={() => {}}
                                        className="pointer-events-none"
                                      />
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                          {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-medium truncate">
                                          {member.full_name || member.email}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {member.role}
                                        </span>
                                      </div>
                                      {responsaveisEdicao.includes(member.user_id) && (
                                        <Check className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Financial Section - Only for projects */}
              {!isMeeting && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Financeiro
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preço Cliente ({currencySymbol}) *</Label>
                        <CurrencyInput
                          placeholder="0.00"
                          value={form.watch('agreed_value')}
                          onChange={(value) => form.setValue('agreed_value', value || 0)}
                        />
                      </div>

                      {hasCaptacao && (
                        <div className="space-y-2">
                          <Label>Custo Captação ({currencySymbol})</Label>
                          <CurrencyInput
                            placeholder="0.00"
                            value={form.watch('custo_captacao')}
                            onChange={(value) => form.setValue('custo_captacao', value || 0)}
                          />
                        </div>
                      )}

                      {hasEdicao && (
                        <div className="space-y-2">
                          <Label>Custo Edição ({currencySymbol})</Label>
                          <CurrencyInput
                            placeholder="0.00"
                            value={form.watch('custo_edicao')}
                            onChange={(value) => form.setValue('custo_edicao', value || 0)}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Custos Extras ({currencySymbol})</Label>
                        <CurrencyInput
                          placeholder="Equipamento, deslocação..."
                          value={form.watch('custos_extras')}
                          onChange={(value) => form.setValue('custos_extras', value || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Links e Pastas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Links e Pastas
                </h3>

                {mediaLinks.length > 0 && (
                  <div className="space-y-2">
                    {mediaLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <Badge variant="secondary">{linkTypeLabels[link.type]}</Badge>
                        <span className="text-sm truncate flex-1">{link.url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeMediaLink(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Select value={newLinkType} onValueChange={setNewLinkType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(linkTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Cole o link aqui..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMediaLink();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addMediaLink} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adicione quantos links precisar (Google Drive, Dropbox, YouTube, etc.)
                </p>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descrição do projeto..."
                  {...form.register('notes')}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="gradient-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A criar...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Projeto
                    </>
                  )}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <CreateClientModal
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onSuccess={handleClientCreated}
      />

      <CreateCategoryModal
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onSuccess={handleCategoryCreated}
      />

      <UpgradeAlert
        isOpen={upgradeAlert.isOpen}
        onClose={closeUpgradeAlert}
        feature={upgradeAlert.feature}
        requiredPlan={upgradeAlert.requiredPlan}
        currentPlan={currentPlan}
        isLimitReached={upgradeAlert.isLimitReached}
        currentUsage={activeProjects}
        limit={projectsLimit}
        alternativeAction={{
          label: '💡 Alternativa: Finalize projetos existentes',
          description: 'Projetos entregues não contam para o limite. Finalize projetos para liberar espaço.',
        }}
      />
    </>
  );
}
