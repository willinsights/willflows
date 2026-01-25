import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isPast, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Building2, 
  Phone, 
  Mail, 
  Euro, 
  CalendarClock,
  GripVertical,
  MoreHorizontal,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Lead, LeadStatus } from '@/hooks/useLeads';
import { LEAD_SOURCES } from '@/hooks/useLeads';

interface LeadCardProps {
  lead: Lead;
  onEdit?: (lead: Lead) => void;
  onContact?: (lead: Lead) => void;
  onScheduleFollowUp?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
  onMarkLost?: (lead: Lead) => void;
  formatCurrency: (value: number) => string;
}

export function LeadCard({
  lead,
  onEdit,
  onContact,
  onScheduleFollowUp,
  onConvert,
  onMarkLost,
  formatCurrency,
}: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sourceLabel = LEAD_SOURCES.find(s => s.value === lead.lead_source)?.label || lead.lead_source;
  const hasOverdueFollowUp = lead.next_follow_up && isPast(new Date(lead.next_follow_up)) && !isToday(new Date(lead.next_follow_up));
  const hasTodayFollowUp = lead.next_follow_up && isToday(new Date(lead.next_follow_up));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer group',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        hasOverdueFollowUp && 'border-destructive/50',
        hasTodayFollowUp && 'border-amber-500/50'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{lead.name}</h4>
            {lead.company && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                {lead.company}
              </p>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(lead)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onContact?.(lead)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Registar Contacto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp?.(lead)}>
              <Calendar className="h-4 w-4 mr-2" />
              Agendar Follow-up
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onConvert?.(lead)} className="text-emerald-600">
              Converter em Cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMarkLost?.(lead)} className="text-destructive">
              Marcar como Perdido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contact Info */}
      <div className="space-y-1 mb-2">
        {lead.email && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 flex-shrink-0" />
            {lead.email}
          </p>
        )}
        {lead.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3 w-3 flex-shrink-0" />
            {lead.phone}
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {lead.lead_source && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {sourceLabel}
          </Badge>
        )}
        {lead.estimated_value && lead.estimated_value > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-200">
            <Euro className="h-2.5 w-2.5 mr-0.5" />
            {formatCurrency(lead.estimated_value)}
          </Badge>
        )}
      </div>

      {/* Follow-up */}
      {lead.next_follow_up && (
        <div className={cn(
          'flex items-center gap-1.5 text-xs rounded-md px-2 py-1 -mx-1',
          hasOverdueFollowUp && 'bg-destructive/10 text-destructive',
          hasTodayFollowUp && 'bg-amber-500/10 text-amber-600',
          !hasOverdueFollowUp && !hasTodayFollowUp && 'bg-muted text-muted-foreground'
        )}>
          <CalendarClock className="h-3 w-3" />
          <span>
            {hasOverdueFollowUp ? 'Atrasado: ' : hasTodayFollowUp ? 'Hoje: ' : 'Follow-up: '}
            {format(new Date(lead.next_follow_up), "d MMM", { locale: pt })}
          </span>
        </div>
      )}

      {/* Last contact */}
      {lead.last_contact_at && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Último contacto: {format(new Date(lead.last_contact_at), "d MMM", { locale: pt })}
        </p>
      )}
    </div>
  );
}
