import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Edit, Trash2, CheckCircle, Calendar, MapPin, Clock, 
  AlertTriangle, Save, X, Camera, Film, DollarSign, Users, Check, MessageSquare, Copy, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useCategories } from '@/hooks/useCategories';
import { useWorkspaceMembers, type PendingInvitation } from '@/hooks/useWorkspaceMembers';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/hooks/useKanban';
import type { Tables } from '@/integrations/supabase/types';
import { priorityOptions, typeOptions, categoryOptions, itemTypeLabels, itemTypeOptions } from './constants';

interface EditModeContentProps {
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  clients: any[];
  categories: any[];
  workspaceMembers: any[];
  pendingInvitations: PendingInvitation[];
  responsaveisCaptacao: string[];
  setResponsaveisCaptacao: React.Dispatch<React.SetStateAction<string[]>>;
  responsaveisEdicao: string[];
  setResponsaveisEdicao: React.Dispatch<React.SetStateAction<string[]>>;
}

export function EditModeContent({
  editForm,
  setEditForm,
  clients,
  categories,
  workspaceMembers,
  pendingInvitations,
  responsaveisCaptacao,
  setResponsaveisCaptacao,
  responsaveisEdicao,
  setResponsaveisEdicao,
}: EditModeContentProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Item</Label>
          <Select 
            value={editForm.item_type} 
            onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, item_type: value }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {itemTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ID do Projeto</Label>
          <Input value={editForm.project_code} onChange={(e) => setEditForm((prev: any) => ({ ...prev, project_code: e.target.value }))} placeholder="Ex: PRJ-2024-001" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={editForm.client_id || "__none__"} onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, client_id: value === "__none__" ? "" : value }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {clients.map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select value={editForm.priority} onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, priority: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {priorityOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(editForm.item_type === 'projeto_edicao' || editForm.item_type === 'projeto_completo') && (
        <div className="space-y-2">
          <Label>Tipo de trabalho de edição</Label>
          <Select
            value={editForm.edit_kind || "__none__"}
            onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, edit_kind: value === "__none__" ? "" : value }))}
          >
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Não definido</SelectItem>
              <SelectItem value="edicao">Edição</SelectItem>
              <SelectItem value="reedicao">Reedição</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}



      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={editForm.custom_category_id || "__none__"} onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, custom_category_id: value === "__none__" ? "" : value }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data de Captação</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editForm.shoot_date && "text-muted-foreground")}>
                <Calendar className="mr-2 h-4 w-4" />
                {editForm.shoot_date ? format(editForm.shoot_date, 'dd/MM/yyyy') : 'Selecionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={editForm.shoot_date || undefined} onSelect={(date) => setEditForm((prev: any) => ({ ...prev, shoot_date: date || null }))} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Data de Entrega</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editForm.delivery_date && "text-muted-foreground")}>
                <Clock className="mr-2 h-4 w-4" />
                {editForm.delivery_date ? format(editForm.delivery_date, 'dd/MM/yyyy') : 'Selecionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={editForm.delivery_date || undefined} onSelect={(date) => setEditForm((prev: any) => ({ ...prev, delivery_date: date || null }))} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hora Início</Label>
          <Input type="time" value={editForm.shoot_start_time} onChange={(e) => setEditForm((prev: any) => ({ ...prev, shoot_start_time: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Hora Fim</Label>
          <Input type="time" value={editForm.shoot_end_time} onChange={(e) => setEditForm((prev: any) => ({ ...prev, shoot_end_time: e.target.value }))} />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input value={editForm.city} onChange={(e) => setEditForm((prev: any) => ({ ...prev, city: e.target.value }))} placeholder="Lisboa, Porto..." />
        </div>
        <div className="space-y-2">
          <Label>Morada</Label>
          <Input value={editForm.address} onChange={(e) => setEditForm((prev: any) => ({ ...prev, address: e.target.value }))} placeholder="Endereço completo" />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium text-sm">Responsáveis</h4>
        <div className="grid grid-cols-2 gap-4">
          <TeamMemberSelector
            label="Responsáveis Captação"
            selectedMembers={responsaveisCaptacao}
            setSelectedMembers={setResponsaveisCaptacao}
            workspaceMembers={workspaceMembers}
            pendingInvitations={pendingInvitations}
          />
          <TeamMemberSelector
            label="Responsáveis Edição"
            selectedMembers={responsaveisEdicao}
            setSelectedMembers={setResponsaveisEdicao}
            workspaceMembers={workspaceMembers}
            pendingInvitations={pendingInvitations}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Descrição projeto</Label>
        <Textarea value={editForm.notes} onChange={(e) => setEditForm((prev: any) => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Detalhes sobre o projeto..." />
      </div>
    </>
  );
}

interface TeamMemberSelectorProps {
  label: string;
  selectedMembers: string[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>;
  workspaceMembers: any[];
  pendingInvitations: PendingInvitation[];
}

function TeamMemberSelector({ label, selectedMembers, setSelectedMembers, workspaceMembers, pendingInvitations }: TeamMemberSelectorProps) {
  // Get display name for a member ID (could be user_id or inv_invitationId)
  const getMemberDisplay = (memberId: string) => {
    if (memberId.startsWith('inv_')) {
      const invitation = pendingInvitations.find(inv => inv.id === memberId);
      return invitation?.email_masked || 'Convite pendente';
    }
    const member = workspaceMembers.find((m: any) => m.user_id === memberId);
    return member?.full_name || member?.email || memberId;
  };

  const isInvitation = (memberId: string) => memberId.startsWith('inv_');

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-start text-left font-normal min-h-[40px] h-auto">
            {selectedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedMembers.map(memberId => (
                  <Badge 
                    key={memberId} 
                    variant={isInvitation(memberId) ? "outline" : "secondary"} 
                    className={cn("text-xs flex items-center gap-1", isInvitation(memberId) && "border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400")}
                  >
                    {getMemberDisplay(memberId)}
                    {isInvitation(memberId) && <span className="text-[10px]">⏳</span>}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMembers(prev => prev.filter(id => id !== memberId));
                      }}
                      className="ml-0.5 hover:text-destructive transition-colors"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Selecionar responsáveis...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-2 max-h-[350px] overflow-y-auto" align="start">
          <div className="space-y-1">
            {/* Active Members */}
            {workspaceMembers.length > 0 && (
              <>
                {workspaceMembers.map((member: any) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setSelectedMembers(prev =>
                        prev.includes(member.user_id)
                          ? prev.filter(id => id !== member.user_id)
                          : [...prev, member.user_id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedMembers.includes(member.user_id)} onCheckedChange={() => {}} className="pointer-events-none" />
                    <Avatar className="h-[30px] w-[30px]">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{(member.full_name || member.email).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{member.full_name || member.email}</span>
                      <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                    </div>
                    {selectedMembers.includes(member.user_id) && <Check className="h-4 w-4 text-primary" />}
                  </div>
                ))}
              </>
            )}
            
            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Convites Pendentes</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {pendingInvitations.length}
                  </Badge>
                </div>
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer border-l-2 border-amber-500/30"
                    onClick={() => {
                      setSelectedMembers(prev =>
                        prev.includes(invitation.id)
                          ? prev.filter(id => id !== invitation.id)
                          : [...prev, invitation.id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedMembers.includes(invitation.id)} onCheckedChange={() => {}} className="pointer-events-none" />
                    <Avatar className="h-[30px] w-[30px] bg-amber-500/10">
                      <AvatarFallback className="text-[10px] text-amber-600 dark:text-amber-400">✉</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{invitation.email_masked || 'Email oculto'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground capitalize">{invitation.role}</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">• Pendente</span>
                      </div>
                    </div>
                    {selectedMembers.includes(invitation.id) && <Check className="h-4 w-4 text-primary" />}
                  </div>
                ))}
              </>
            )}
            
            {workspaceMembers.length === 0 && pendingInvitations.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">Nenhum membro ou convite encontrado</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
