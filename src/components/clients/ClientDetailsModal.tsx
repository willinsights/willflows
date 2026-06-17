import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  Building2,
  Mail,
  Phone,
  Video,
  MessageSquare,
  FileText,
  Calendar,
  Euro,
  Plus,
  Trash2,
  Users,
  Pencil,
  X,
  Save,
  MapPin,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useClientCommunications } from '@/hooks/useClientCommunications';
import { useClientNotes } from '@/hooks/useClientNotes';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { CreateCommunicationModal } from './CreateCommunicationModal';
import { CreateNoteModal } from './CreateNoteModal';
import { MeetingRoomModal } from '@/components/calendar/MeetingRoomModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  country?: string | null;
  nif?: string | null;
  notes?: string | null;
  created_at: string;
  vat_exempt?: boolean | null;
  vat_rate_override?: number | null;
  vat_regime_override?: string | null;
}

interface Project {
  id: string;
  name: string;
  project_code?: string | null;
  current_phase: string;
  is_delivered: boolean;
  agreed_value?: number | null;
  custo_captacao?: number | null;
  custo_edicao?: number | null;
  custos_extras?: number | null;
  created_at: string;
  delivery_date?: string | null;
  category: string;
  workspace_id: string;
}

interface ClientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  projects: Project[];
  onClientUpdate?: (clientId: string, updates: Partial<Client>) => Promise<any>;
}

const phaseLabels: Record<string, string> = {
  captacao: 'Em Captação',
  edicao: 'Em Edição',
};

const categoryColors: Record<string, string> = {
  hotel: 'bg-blue-500',
  experiencia: 'bg-purple-500',
  evento: 'bg-amber-500',
  outro: 'bg-gray-500',
};

const communicationTypeLabels: Record<string, { label: string; icon: typeof Phone }> = {
  call: { label: 'Chamada', icon: Phone },
  email: { label: 'Email', icon: Mail },
  meeting: { label: 'Reunião', icon: Users },
  other: { label: 'Outro', icon: MessageSquare },
};

export function ClientDetailsModal({ open, onOpenChange, client, projects, onClientUpdate }: ClientDetailsModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [meetingRoomUrl, setMeetingRoomUrl] = useState<string | null>(null);
  const [meetingRoomSubject, setMeetingRoomSubject] = useState<string>('');
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    nif: '',
    address: '',
    postal_code: '',
    country: '',
    notes: '',
    vat_exempt: false,
    vat_rate_override: '' as string,
    vat_regime_override: 'standard' as string,
  });
  
  const { currentWorkspace, isAdmin } = useWorkspace();
  const { canViewAllFinancials, canViewClientContacts } = useFinancialPermissions();
  const { projectChats, createProjectChat } = useConversations();
  const { user } = useAuth();
  
  // Sincronizar formulário quando cliente muda
  useEffect(() => {
    if (client) {
      setEditForm({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        company: client.company || '',
        nif: client.nif || '',
        address: client.address || '',
        postal_code: client.postal_code || '',
        country: client.country || '',
        notes: client.notes || '',
        vat_exempt: !!client.vat_exempt,
        vat_rate_override: client.vat_rate_override != null ? String(client.vat_rate_override) : '',
        vat_regime_override: client.vat_regime_override || 'standard',
      });
    }
  }, [client]);
  
  // Reset edit mode when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);
  
  const { 
    communications, 
    loading: communicationsLoading, 
    createCommunication,
    deleteCommunication 
  } = useClientCommunications(client?.id || null);
  
  const { 
    notes: clientNotes, 
    loading: notesLoading, 
    createNote,
    deleteNote 
  } = useClientNotes(client?.id || null);

  const handleSaveEdit = async () => {
    if (!client || !onClientUpdate) return;
    
    setSavingEdit(true);
    const rateNum = editForm.vat_rate_override.trim() === '' ? null : Number(editForm.vat_rate_override);
    const result = await onClientUpdate(client.id, {
      name: editForm.name.trim(),
      email: editForm.email.trim() || null,
      phone: editForm.phone.trim() || null,
      company: editForm.company.trim() || null,
      nif: editForm.nif.trim() || null,
      address: editForm.address.trim() || null,
      postal_code: editForm.postal_code.trim() || null,
      country: editForm.country.trim() || null,
      notes: editForm.notes.trim() || null,
      vat_exempt: editForm.vat_exempt,
      vat_rate_override: editForm.vat_exempt ? null : (Number.isFinite(rateNum as number) ? rateNum : null),
      vat_regime_override: editForm.vat_exempt ? 'exempt' : (editForm.vat_regime_override || null),
    } as any);
    
    if (result) {
      setIsEditing(false);
    }
    setSavingEdit(false);
  };

  const handleCancelEdit = () => {
    if (client) {
      setEditForm({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        company: client.company || '',
        nif: client.nif || '',
        address: client.address || '',
        postal_code: client.postal_code || '',
        country: client.country || '',
        notes: client.notes || '',
        vat_exempt: !!client.vat_exempt,
        vat_rate_override: client.vat_rate_override != null ? String(client.vat_rate_override) : '',
        vat_regime_override: client.vat_regime_override || 'standard',
      });
    }
    setIsEditing(false);
  };

  const { formatCurrency } = useFormatCurrency();

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = projects.reduce((sum, p) => sum + (p.agreed_value || 0), 0);
    const totalCosts = projects.reduce((sum, p) => 
      sum + (p.custo_captacao || 0) + (p.custo_edicao || 0) + (p.custos_extras || 0), 0);
    const margin = totalRevenue - totalCosts;
    const marginPercent = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;
    const activeProjects = projects.filter(p => !p.is_delivered).length;
    const completedProjects = projects.filter(p => p.is_delivered).length;
    const avgProjectValue = projects.length > 0 ? totalRevenue / projects.length : 0;

    return {
      totalRevenue,
      totalCosts,
      margin,
      marginPercent,
      activeProjects,
      completedProjects,
      avgProjectValue,
      totalProjects: projects.length
    };
  }, [projects]);

  // Monthly evolution data
  const monthlyData = useMemo(() => {
    const months: Record<string, { projects: number; revenue: number }> = {};
    
    projects.forEach(p => {
      const monthKey = format(new Date(p.created_at), 'MM/yyyy');
      if (!months[monthKey]) {
        months[monthKey] = { projects: 0, revenue: 0 };
      }
      months[monthKey].projects++;
      months[monthKey].revenue += p.agreed_value || 0;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
  }, [projects]);

  const handleCreateCommunication = async (data: {
    type: string;
    subject: string;
    description?: string;
    contact_date: string;
    meet_url?: string;
  }) => {
    if (!client) return false;
    const result = await createCommunication({
      client_id: client.id,
      ...data,
    });
    return !!result;
  };

  const handleCreateNote = async (content: string) => {
    if (!client) return false;
    const result = await createNote({
      client_id: client.id,
      content,
    });
    return !!result;
  };

  const handleOpenChat = async () => {
    if (!user || projects.length === 0) return;
    setOpeningChat(true);
    
    const attemptId = crypto.randomUUID().slice(0, 8);
    
    try {
      // Get the most recent project for this client
      const recentProject = [...projects].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      
      // Check if conversation exists for this project
      let conversationId = projectChats.find(c => c.project_id === recentProject.id)?.id;
      
      if (!conversationId) {
        // Create new conversation for the project using the project's workspace_id
        const newConversation = await createProjectChat.mutateAsync({
          projectId: recentProject.id,
          projectName: recentProject.name,
          workspaceId: recentProject.workspace_id,
          attemptId,
        });
        conversationId = newConversation.id;
      }
      
      onOpenChange(false);
      navigate(`/app/chat/${conversationId}`);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setOpeningChat(false);
    }
  };

  if (!client) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-start justify-between w-full">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-primary">{isEditing ? 'Editar Cliente' : client.name}</h2>
                {!isEditing && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {client.company && (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {client.company}
                      </Badge>
                    )}
                    {canViewAllFinancials && (
                      <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
                        <Euro className="h-3 w-3" />
                        {formatCurrency(stats.totalRevenue)} receita
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
                      <Video className="h-3 w-3" />
                      {stats.totalProjects} projetos
                    </Badge>
                  </div>
                )}
              </div>
              {/* Edit button - only for admin users */}
              {isAdmin && onClientUpdate && !isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 gap-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6">
              <TabsList className="w-full justify-start bg-muted/50">
                <TabsTrigger value="info" className="gap-2">
                  <User className="h-4 w-4" />
                  Informações
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-2">
                  <Video className="h-4 w-4" />
                  Projetos
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {stats.totalProjects}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[60vh]">
                {/* Info Tab */}
                <TabsContent value="info" className="p-6 pt-4 space-y-6 mt-0">
                {/* Edit Form */}
                {isEditing ? (
                  <div className="space-y-4">
                    {/* Nome */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Nome *</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome do contacto"
                      />
                    </div>

                    {/* Nome da Empresa */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-company">Nome da Empresa *</Label>
                      <Input
                        id="edit-company"
                        value={editForm.company}
                        onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Nome da empresa"
                      />
                    </div>

                    {/* Tax ID com Tooltip */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="edit-nif">Tax ID *</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Número fiscal do país (ex.: NIF, VAT, CNPJ, CPF, EIN…)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="edit-nif"
                        value={editForm.nif}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nif: e.target.value }))}
                        placeholder="ex.: NIF, VAT, CNPJ, CPF, EIN…"
                      />
                    </div>

                    {/* Morada Fiscal */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Morada Fiscal *</Label>
                      <Input
                        id="edit-address"
                        value={editForm.address}
                        onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Rua, número, andar..."
                      />
                    </div>

                    {/* Código Postal e País */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-postal_code">Código Postal *</Label>
                        <Input
                          id="edit-postal_code"
                          value={editForm.postal_code}
                          onChange={(e) => setEditForm(prev => ({ ...prev, postal_code: e.target.value }))}
                          placeholder="1000-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-country">País *</Label>
                        <Input
                          id="edit-country"
                          value={editForm.country}
                          onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                          placeholder="Portugal"
                        />
                      </div>
                    </div>

                    {/* Email de Faturação */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email de Faturação *</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="faturacao@empresa.pt"
                      />
                    </div>

                    {/* Contacto Telefónico */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Contacto Telefónico</Label>
                      <Input
                        id="edit-phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+351 912 345 678"
                      />
                    </div>
                    
                    {/* Fiscal */}
                    <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/20">

                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Fiscal</Label>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Cliente isento de IVA</p>
                          <p className="text-[11px] text-muted-foreground">Aplica taxa 0% em todas as faturas deste cliente</p>
                        </div>
                        <Switch
                          checked={editForm.vat_exempt}
                          onCheckedChange={(v) => setEditForm(prev => ({ ...prev, vat_exempt: v }))}
                        />
                      </div>
                      {!editForm.vat_exempt && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Taxa de IVA personalizada (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              value={editForm.vat_rate_override}
                              onChange={(e) => setEditForm(prev => ({ ...prev, vat_rate_override: e.target.value }))}
                              placeholder="—"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Regime fiscal</Label>
                            <Select
                              value={editForm.vat_regime_override}
                              onValueChange={(v) => setEditForm(prev => ({ ...prev, vat_regime_override: v }))}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Padrão</SelectItem>
                                <SelectItem value="reduced">Taxa reduzida</SelectItem>
                                <SelectItem value="reverse_charge">IVA reverso (UE)</SelectItem>
                                <SelectItem value="brazil">Brasil</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Se não definido, aplica-se a taxa padrão do workspace.
                      </p>
                    </div>

                    {/* Notas Internas */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-notes">Notas Internas</Label>
                      <Textarea
                        id="edit-notes"
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Notas sobre o cliente..."
                        rows={3}
                      />
                    </div>
                    
                    
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={savingEdit}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={savingEdit || !editForm.name.trim()}
                        className="gradient-primary"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {savingEdit ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    {canViewClientContacts && client.email && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${client.email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </a>
                      </Button>
                    )}
                    {canViewClientContacts && client.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${client.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Ligar
                        </a>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCommunicationModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Comunicação
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNoteModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nota
                    </Button>
                    {/* Chat button - always visible if there are projects */}
                    {projects.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleOpenChat}
                        disabled={openingChat}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {openingChat ? 'Abrindo...' : 'Chat'}
                      </Button>
                    )}
                  </div>

                  {/* Contact & Company Cards */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Contato</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            {canViewClientContacts ? (
                              client.email ? (
                                <a href={`mailto:${client.email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                              )
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Acesso restrito</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Telefone</p>
                            {canViewClientContacts ? (
                              client.phone ? (
                                <a href={`tel:${client.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {client.phone}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                              )
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Acesso restrito</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Empresa</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Nome da Empresa</p>
                            <p className="text-sm font-medium">{client.company || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cliente desde</p>
                            <p className="text-sm font-medium">
                              {format(new Date(client.created_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Communications History */}
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Comunicações</span>
                          <Badge variant="secondary" className="h-5 px-1.5">
                            {communications.length}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowCommunicationModal(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {communicationsLoading ? (
                        <div className="space-y-2 py-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-start gap-3 p-2">
                              <Skeleton className="h-7 w-7 rounded-md" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : communications.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {communications.map((comm) => {
                            const typeInfo = communicationTypeLabels[comm.type] || communicationTypeLabels.other;
                            const TypeIcon = typeInfo.icon;
                            return (
                              <div 
                                key={comm.id} 
                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 group"
                              >
                                <div className="p-1.5 rounded-md bg-primary/10">
                                  <TypeIcon className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{comm.subject}</p>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {typeInfo.label}
                                    </Badge>
                                    {comm.meet_url && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMeetingRoomUrl(comm.meet_url);
                                          setMeetingRoomSubject(comm.subject);
                                        }}
                                        className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                      >
                                        <Video className="h-3 w-3" />
                                        Meet
                                      </button>
                                    )}
                                  </div>
                                  {comm.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                      {comm.description}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {format(new Date(comm.contact_date), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => deleteCommunication(comm.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 text-center">
                          <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhuma comunicação registrada</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Notas</span>
                          <Badge variant="secondary" className="h-5 px-1.5">
                            {clientNotes.length}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowNoteModal(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {notesLoading ? (
                        <div className="space-y-2 py-2">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="p-2 space-y-2">
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          ))}
                        </div>
                      ) : clientNotes.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {clientNotes.map((note) => (
                            <div 
                              key={note.id} 
                              className="p-2 rounded-lg hover:bg-muted/50 group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {format(new Date(note.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={() => deleteNote(note.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center">
                          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhuma nota registrada</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </>
                )}
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects" className="p-6 pt-4 space-y-6 mt-0">
                  {/* Summary Stats - Compact */}
                  <div className={cn("grid gap-3", canViewAllFinancials ? "grid-cols-4" : "grid-cols-2")}>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold">{stats.totalProjects}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-xl font-bold text-primary">{stats.activeProjects}</p>
                      <p className="text-xs text-muted-foreground">Ativos</p>
                    </div>
                    {canViewAllFinancials && (
                      <>
                        <div className="text-center p-3 rounded-lg bg-success/10">
                          <p className="text-xl font-bold text-success">{formatCurrency(stats.totalRevenue)}</p>
                          <p className="text-xs text-muted-foreground">Receita</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xl font-bold">{stats.marginPercent.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">Margem</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Projects Table */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold">Histórico de Projetos</h4>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium">Data</th>
                            <th className="text-left p-3 font-medium">Projeto</th>
                            <th className="text-left p-3 font-medium">Fase</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            {canViewAllFinancials && (
                              <>
                                <th className="text-right p-3 font-medium">Valor</th>
                                <th className="text-right p-3 font-medium">Margem</th>
                              </>
                            )}
                            <th className="text-center p-3 font-medium">Pagamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.map((project, index) => {
                            const costs = (project.custo_captacao || 0) + (project.custo_edicao || 0) + (project.custos_extras || 0);
                            const margin = (project.agreed_value || 0) - costs;
                            return (
                              <motion.tr 
                                key={project.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="border-t hover:bg-muted/30 transition-colors"
                              >
                                <td className="p-3 text-muted-foreground">
                                  {format(new Date(project.created_at), 'dd/MM/yyyy')}
                                </td>
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{project.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <span className={cn("w-2 h-2 rounded-full", categoryColors[project.category] || 'bg-gray-500')} />
                                      {project.category.charAt(0).toUpperCase() + project.category.slice(1)}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-xs">
                                    {project.current_phase === 'captacao' ? 'Captação' : 'Edição'}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <Badge 
                                    variant={project.is_delivered ? 'secondary' : 'default'}
                                    className={cn(
                                      "text-xs",
                                      project.is_delivered ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-500'
                                    )}
                                  >
                                    {project.is_delivered ? 'Entregue' : phaseLabels[project.current_phase] || 'Em progresso'}
                                  </Badge>
                                </td>
                                {canViewAllFinancials && (
                                  <>
                                    <td className="p-3 text-right font-medium text-success">
                                      {formatCurrency(project.agreed_value || 0)}
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                      {formatCurrency(margin)}
                                    </td>
                                  </>
                                )}
                                <td className="p-3 text-center">
                                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                                    Pendente
                                  </Badge>
                                </td>
                              </motion.tr>
                            );
                          })}
                          {projects.length === 0 && (
                            <tr>
                              <td colSpan={canViewAllFinancials ? 7 : 5} className="p-8 text-center text-muted-foreground">
                                Nenhum projeto encontrado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Monthly Evolution - only for admin */}
                  {canViewAllFinancials && monthlyData.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Evolução Mensal</h4>
                      <div className="space-y-2">
                        {monthlyData.map(([month, data]) => (
                          <div key={month} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-16">{month}</span>
                            <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((data.revenue / stats.totalRevenue) * 100, 100)}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-20 text-right">{data.projects} projetos</span>
                            <span className="text-sm font-medium text-success w-24 text-right">{formatCurrency(data.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateCommunicationModal
        open={showCommunicationModal}
        onOpenChange={setShowCommunicationModal}
        onSubmit={handleCreateCommunication}
      />

      <CreateNoteModal
        open={showNoteModal}
        onOpenChange={setShowNoteModal}
        onSubmit={handleCreateNote}
      />

      {meetingRoomUrl && (
        <MeetingRoomModal
          open={!!meetingRoomUrl}
          onOpenChange={(open) => {
            if (!open) setMeetingRoomUrl(null);
          }}
          meetUrl={meetingRoomUrl}
          title={meetingRoomSubject}
        />
      )}
    </>
  );
}
