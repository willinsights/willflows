import { useState, useEffect, useMemo, useCallback } from 'react';
import { DollarSign, User, Camera, Film, CreditCard, Calendar, Package, Lock, RotateCcw, List } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useHideValues } from '@/hooks/useHideValues';
import { cn } from '@/lib/utils';
import { TeamMemberPaymentInput } from './TeamMemberPaymentInput';
import type { Tables } from '@/integrations/supabase/types';

type ProjectTeam = Tables<'project_team'>;
type Payment = Tables<'payments'>;
type PaymentStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado';

interface WorkspaceMember {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface ProjectFinancialTabProps {
  projectId: string;
  project: {
    agreed_value: number | null;
    custo_captacao: number | null;
    custo_edicao: number | null;
    custos_extras: number | null;
    custos_extras_payment_status?: string | null;
    client_id: string | null;
  };
  projectTeam: ProjectTeam[];
  workspaceMembers: WorkspaceMember[];
  isEditing: boolean;
  editForm: {
    agreed_value: number;
    custo_captacao: number;
    custo_edicao: number;
    custos_extras: number;
  };
  setEditForm: (fn: (prev: any) => any) => void;
  onTeamPaymentUpdate: () => void;
}

const paymentStatusOptions = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: 'pago', label: 'Pago', color: 'bg-success/20 text-success border-success/30' },
  { value: 'vencido', label: 'Vencido', color: 'bg-destructive/20 text-destructive border-destructive/30' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-muted text-muted-foreground border-border' },
];

export function ProjectFinancialTab({
  projectId,
  project,
  projectTeam,
  workspaceMembers,
  isEditing,
  editForm,
  setEditForm,
  onTeamPaymentUpdate,
}: ProjectFinancialTabProps) {
  const { toast } = useToast();
  const { canViewAllFinancials, canViewOwnFinancials, userId } = useFinancialPermissions();
  const { hideValues } = useHideValues();
  const [clientPayment, setClientPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);

  // Se não pode ver valores financeiros (visualizador), mostra mensagem
  if (!canViewOwnFinancials) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lock className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">
          Não tem permissão para ver informação financeira.
        </p>
      </div>
    );
  }

  // Separate team members by phase
  const captacaoTeam = projectTeam.filter(t => t.phase === 'captacao');
  const edicaoTeam = projectTeam.filter(t => t.phase === 'edicao');
  
  // Filtrar membros da equipa para mostrar apenas o próprio utilizador se não for admin
  const visibleCaptacaoTeam = useMemo(() => {
    if (canViewAllFinancials) return captacaoTeam;
    return captacaoTeam.filter(t => t.user_id === userId);
  }, [captacaoTeam, canViewAllFinancials, userId]);
  
  const visibleEdicaoTeam = useMemo(() => {
    if (canViewAllFinancials) return edicaoTeam;
    return edicaoTeam.filter(t => t.user_id === userId);
  }, [edicaoTeam, canViewAllFinancials, userId]);
  
  // Verificar se o utilizador está na equipa deste projeto
  const isUserInProjectTeam = useMemo(() => {
    return projectTeam.some(t => t.user_id === userId);
  }, [projectTeam, userId]);

  // Calculate profit
  const agreedValue = isEditing ? editForm.agreed_value : (project.agreed_value || 0);
  const custoCaptacao = isEditing ? editForm.custo_captacao : (project.custo_captacao || 0);
  const custoEdicao = isEditing ? editForm.custo_edicao : (project.custo_edicao || 0);
  const custosExtras = isEditing ? editForm.custos_extras : (project.custos_extras || 0);
  const totalCustos = custoCaptacao + custoEdicao + custosExtras;
  const profit = agreedValue - totalCustos;

  // Fetch client payment
  useEffect(() => {
    const fetchClientPayment = async () => {
      if (!projectId) return;
      
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_receivable', true)
        .maybeSingle();
      
      setClientPayment(data);
    };

    fetchClientPayment();
  }, [projectId]);

  const getMemberInfo = (userId: string) => {
    const member = workspaceMembers.find(m => m.user_id === userId);
    return member || { full_name: 'Desconhecido', avatar_url: null, email: '' };
  };

  const handleClientPaymentStatusChange = async (newStatus: PaymentStatus) => {
    if (!clientPayment) return;
    setLoading(true);

    try {
      const updates: Partial<Payment> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'pago') {
        updates.paid_at = new Date().toISOString();
      } else {
        updates.paid_at = null;
      }

      const { error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', clientPayment.id);

      if (error) throw error;

      setClientPayment(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: 'Status do pagamento atualizado' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Handler for payment amount - used by TeamMemberPaymentInput
  const handleTeamMemberPaymentAmountChange = useCallback(async (
    memberId: string, 
    amount: number
  ) => {
    try {
      const { error } = await supabase
        .from('project_team')
        .update({ payment_amount: amount })
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: 'Pagamento atualizado' });
      onTeamPaymentUpdate();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      throw error; // Re-throw so the input can handle the error state
    }
  }, [toast, onTeamPaymentUpdate]);

  // Handler for payment status changes (Select component)
  const handleTeamMemberPaymentStatusChange = async (
    memberId: string, 
    status: PaymentStatus
  ) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('project_team')
        .update({ payment_status: status })
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: 'Pagamento atualizado' });
      onTeamPaymentUpdate();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const option = paymentStatusOptions.find(o => o.value === status);
    return option || paymentStatusOptions[0];
  };

  // Custos Extras Payment Section Component
  const CustosExtrasPaymentSection = ({
    projectId,
    custosExtras,
    currentStatus,
    loading,
    setLoading,
  }: {
    projectId: string;
    custosExtras: number;
    currentStatus: PaymentStatus;
    loading: boolean;
    setLoading: (v: boolean) => void;
  }) => {
    const [status, setStatus] = useState<PaymentStatus>(currentStatus);

    const handleCustosExtrasPaymentStatusChange = async (newStatus: PaymentStatus) => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('projects')
          .update({ custos_extras_payment_status: newStatus })
          .eq('id', projectId);

        if (error) throw error;

        setStatus(newStatus);
        toast({ title: 'Status do pagamento atualizado' });
      } catch (error: any) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    const statusOption = getStatusBadge(status);

    return (
      <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
        <div className="flex items-center gap-2 text-foreground">
          <Package className="h-4 w-4" />
          <span className="font-medium">Pagamento Custos Extras</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
          <div className="space-y-1">
            <p className="text-sm font-medium">€{custosExtras.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Equipamento, deslocação, etc.</p>
          </div>
          
          <Select
            value={status}
            onValueChange={(value: PaymentStatus) => handleCustosExtrasPaymentStatusChange(value)}
            disabled={loading}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentStatusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className={cn("px-2 py-0.5 rounded text-xs", opt.color)}>
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderTeamPaymentSection = (
    title: string, 
    icon: React.ReactNode, 
    team: ProjectTeam[],
    phase: 'captacao' | 'edicao'
  ) => {
    // Calculate suggested amount based on phase
    const totalCost = phase === 'edicao' ? custoEdicao : custoCaptacao;
    const suggestedAmount = team.length > 0 ? totalCost / team.length : 0;

    if (team.length === 0) {
      return (
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          <p className="text-sm text-muted-foreground">Nenhum membro atribuído</p>
        </div>
      );
    }

    return (
      <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
        <div className="flex items-center gap-2 text-foreground">
          {icon}
          <span className="font-medium">{title}</span>
          <Badge variant="outline" className="ml-auto">{team.length} membro(s)</Badge>
          {suggestedAmount > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              (sugerido: €{suggestedAmount.toFixed(2)}/cada)
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          {team.map((member) => {
            const profile = getMemberInfo(member.user_id);
            const statusOption = getStatusBadge(member.payment_status);
            const currentAmount = member.payment_amount || 0;
            const isManuallyEdited = currentAmount > 0 && Math.abs(currentAmount - suggestedAmount) > 0.01;
            
            return (
              <div 
                key={member.id} 
                className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border/30"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {(profile.full_name || profile.email || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {profile.full_name || profile.email || 'Desconhecido'}
                    </p>
                    {isManuallyEdited && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        Editado
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TeamMemberPaymentInput
                    memberId={member.id}
                    initialAmount={member.payment_amount}
                    suggestedAmount={suggestedAmount}
                    isManuallyEdited={isManuallyEdited}
                    disabled={loading}
                    onSave={handleTeamMemberPaymentAmountChange}
                  />
                  
                  <Select
                    value={member.payment_status}
                    onValueChange={(value: PaymentStatus) => 
                      handleTeamMemberPaymentStatusChange(member.id, value)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={cn("px-2 py-0.5 rounded text-xs", opt.color)}>
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Se não for admin e não estiver na equipa, mostra apenas mensagem
  if (!canViewAllFinancials && !isUserInProjectTeam) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lock className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">
          Não está atribuído a este projeto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary - Apenas para admins */}
      {canViewAllFinancials && (
        <>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Preço Cliente (€)</Label>
                  <CurrencyInput 
                    value={editForm.agreed_value}
                    onChange={(value) => setEditForm((prev: any) => ({ ...prev, agreed_value: value || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo Captação (€)</Label>
                  <CurrencyInput 
                    value={editForm.custo_captacao}
                    onChange={(value) => setEditForm((prev: any) => ({ ...prev, custo_captacao: value || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo Edição (€)</Label>
                  <CurrencyInput 
                    value={editForm.custo_edicao}
                    onChange={(value) => setEditForm((prev: any) => ({ ...prev, custo_edicao: value || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custos Extras (€)</Label>
                  <CurrencyInput 
                    value={editForm.custos_extras}
                    onChange={(value) => setEditForm((prev: any) => ({ ...prev, custos_extras: value || 0 }))}
                    placeholder="Equipamento, deslocação..."
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lucro Estimado</span>
                  <span className={cn("text-xl font-bold", profit >= 0 ? "text-success" : "text-destructive")}>
                    €{profit.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  (Preço Cliente - Captação - Edição - Extras)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Linha 1: Receita e Custos operacionais */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Preço Cliente
                  </span>
                  <p className={cn("text-xl font-bold text-success mt-1", hideValues && "blur-md select-none")}>
                    €{agreedValue.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Camera className="h-3 w-3" /> Custo Captação
                  </span>
                  <p className={cn("text-xl font-bold text-destructive mt-1", hideValues && "blur-md select-none")}>
                    €{custoCaptacao.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Film className="h-3 w-3" /> Custo Edição
                  </span>
                  <p className={cn("text-xl font-bold text-destructive mt-1", hideValues && "blur-md select-none")}>
                    €{custoEdicao.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Linha 2: Extras e Lucro */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" /> Custos Extras
                  </span>
                  <p className={cn("text-xl font-bold text-destructive mt-1", hideValues && "blur-md select-none")}>
                    €{custosExtras.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-xs text-muted-foreground">Lucro</span>
                  <p className={cn("text-xl font-bold mt-1", profit >= 0 ? "text-primary" : "text-destructive", hideValues && "blur-md select-none")}>
                    €{profit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Client Payment Status - Apenas para admins */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <CreditCard className="h-4 w-4" />
              <span className="font-medium">Pagamento do Cliente</span>
            </div>

            {clientPayment ? (
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                <div className="space-y-1">
                  <p className="text-sm font-medium">€{clientPayment.amount.toFixed(2)}</p>
                  {clientPayment.due_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Vencimento: {format(new Date(clientPayment.due_date), 'dd/MM/yyyy', { locale: pt })}
                    </p>
                  )}
                </div>
                
                <Select
                  value={clientPayment.status}
                  onValueChange={(value: PaymentStatus) => handleClientPaymentStatusChange(value)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn("px-2 py-0.5 rounded text-xs", opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-3 bg-background/50 rounded-lg border border-border/30 text-center">
                <p className="text-sm text-muted-foreground">
                  {project.client_id 
                    ? 'Nenhum pagamento registado para este projeto'
                    : 'Sem cliente associado'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Custos Extras Payment Status - Apenas para admins */}
          {custosExtras > 0 && (
            <CustosExtrasPaymentSection
              projectId={projectId}
              custosExtras={custosExtras}
              currentStatus={(project.custos_extras_payment_status as PaymentStatus) || 'pendente'}
              loading={loading}
              setLoading={setLoading}
            />
          )}
        </>
      )}

      {/* Team Payments - Filtrado por permissões */}
      {visibleCaptacaoTeam.length > 0 && renderTeamPaymentSection(
        canViewAllFinancials ? 'Pagamento Captação' : 'O Seu Pagamento (Captação)',
        <Camera className="h-4 w-4" />,
        visibleCaptacaoTeam,
        'captacao'
      )}

      {visibleEdicaoTeam.length > 0 && renderTeamPaymentSection(
        canViewAllFinancials ? 'Pagamento Edição' : 'O Seu Pagamento (Edição)',
        <Film className="h-4 w-4" />,
        visibleEdicaoTeam,
        'edicao'
      )}
      
      {/* Mensagem se não houver pagamentos visíveis para não-admin */}
      {!canViewAllFinancials && visibleCaptacaoTeam.length === 0 && visibleEdicaoTeam.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Não tem pagamentos registados neste projeto.
          </p>
        </div>
      )}
    </div>
  );
}