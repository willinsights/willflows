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

interface ViewModeContentProps {
  project: ProjectWithClient;
  categories: any[];
  workspaceMembers: any[];
  responsaveisCaptacao: string[];
  responsaveisEdicao: string[];
  isAdmin: boolean;
}

export function ViewModeContent({
  project,
  categories,
  workspaceMembers,
  responsaveisCaptacao,
  responsaveisEdicao,
  isAdmin,
}: ViewModeContentProps) {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
        <Badge variant="outline" className="text-xs">{itemTypeLabels[project.item_type || 'projeto_completo']}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <InfoRow label="Cliente" value={project.clients?.name} />
        <InfoRow label="Tipo" value={
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {project.type === 'fotografia' && <Camera className="h-4 w-4" />}
            {project.type === 'video' && <Film className="h-4 w-4" />}
            {project.type === 'foto_video' && <><Camera className="h-4 w-4" /><Film className="h-4 w-4" /></>}
            <span>{typeOptions.find(t => t.value === project.type)?.label}</span>
          </div>
        } />
        <InfoRow label="Categoria" value={categories.find(c => c.id === project.custom_category_id)?.name || categoryOptions.find(c => c.value === project.category)?.label || 'Outro'} />
        <InfoRow label="Cidade" value={
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{project.city || '—'}</span>
          </div>
        } />
        <InfoRow label="Captação" value={
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{project.shoot_date ? format(new Date(project.shoot_date), "d MMM yyyy", { locale: pt }) : '—'}</span>
            {(project.shoot_start_time || project.shoot_end_time) && (
              <span className="text-xs">{project.shoot_start_time?.slice(0, 5) || '—'} – {project.shoot_end_time?.slice(0, 5) || '—'}</span>
            )}
          </div>
        } />
        <InfoRow label="Entrega" value={
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{project.delivery_date ? format(new Date(project.delivery_date), "d MMM yyyy", { locale: pt }) : '—'}</span>
          </div>
        } />
        <InfoRow label="Resp. Captação" value={
          <AvatarGroup userIds={responsaveisCaptacao} members={workspaceMembers} />
        } />
        <InfoRow label="Resp. Edição" value={
          <AvatarGroup userIds={responsaveisEdicao} members={workspaceMembers} />
        } />
        <div className="flex items-center py-1.5 col-span-2">
          <span className="w-28 text-sm font-medium shrink-0">ID</span>
          <span className="text-sm font-mono text-primary">{project.project_code || '—'}</span>
        </div>
      </div>

      <Separator className="my-2" />

      <div className="space-y-2">
        <span className="text-sm font-medium">Descrição</span>
        <div className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap min-h-[60px] p-3 rounded-md bg-muted/30",
          !project.notes && "text-muted-foreground italic"
        )}>
          {project.notes || 'Adicione uma descrição com diretrizes para o projeto...'}
        </div>
      </div>

      {isAdmin && project.internal_notes && (
        <div className="mt-2 p-3 bg-muted/20 rounded-md border border-border/30">
          <span className="text-xs font-medium text-muted-foreground">Notas Internas</span>
          <p className="mt-1 text-xs text-muted-foreground/80 whitespace-pre-wrap">{project.internal_notes}</p>
        </div>
      )}
    </>
  );
}

export function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center py-1.5">
      <span className="w-28 text-sm font-medium shrink-0">{label}</span>
      {typeof value === 'string' ? (
        <span className="text-sm text-muted-foreground truncate">{value || '—'}</span>
      ) : (
        value
      )}
    </div>
  );
}

function AvatarGroup({ userIds, members }: { userIds: string[]; members: any[] }) {
  if (userIds.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {userIds.slice(0, 3).map(userId => {
          const member = members.find((m: any) => m.user_id === userId);
          return member ? (
            <Avatar key={userId} className="h-[30px] w-[30px] border border-background">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{(member.full_name || member.email).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : null;
        })}
      </div>
      {userIds.length > 3 && <span className="text-xs text-muted-foreground">+{userIds.length - 3}</span>}
    </div>
  );
}
