import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadCard } from './LeadCard';
import type { Lead, LeadStatus } from '@/hooks/useLeads';
import { LEAD_STATUS_CONFIG } from '@/hooks/useLeads';

interface LeadKanbanProps {
  leadsByStatus: Record<LeadStatus, Lead[]>;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onEdit: (lead: Lead) => void;
  onContact: (lead: Lead) => void;
  onScheduleFollowUp: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onMarkLost: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  formatCurrency: (value: number) => string;
}

// Columns to show in the Kanban (excluding ganho and perdido as final states)
const KANBAN_COLUMNS: LeadStatus[] = ['novo', 'contactado', 'qualificado', 'proposta', 'negociacao'];

function DroppableColumn({
  status,
  leads,
  children,
}: {
  status: LeadStatus;
  leads: Lead[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = LEAD_STATUS_CONFIG[status];
  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * KANBAN_COLUMNS.indexOf(status), duration: 0.35 }}
      className={cn(
        'flex flex-col h-full w-[85vw] max-w-[300px] sm:w-[260px] sm:max-w-none md:w-[280px] flex-shrink-0 snap-start',
        'rounded-xl border bg-muted/30 transition-all',
        isOver && 'ring-2 ring-primary bg-primary/5 scale-[1.01]'
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b bg-muted/20 rounded-t-xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-background', config.bgColor, `ring-${config.bgColor.replace('bg-', '')}/30`)} />
            <h3 className="font-semibold text-sm">{config.label}</h3>
          </div>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {leads.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground font-medium tabular-nums">
            Valor: €{totalValue.toLocaleString('pt-PT')}
          </p>
        )}
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {children}
          {leads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                <div className={cn('w-2 h-2 rounded-full', config.bgColor)} />
              </div>
              <p className="text-xs text-muted-foreground">Arraste leads para aqui</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

export function LeadKanban({
  leadsByStatus,
  onStatusChange,
  onEdit,
  onContact,
  onScheduleFollowUp,
  onConvert,
  onMarkLost,
  onDelete,
  formatCurrency,
}: LeadKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;

    // Find which column the lead was in
    let currentStatus: LeadStatus | null = null;
    for (const [status, leads] of Object.entries(leadsByStatus)) {
      if (leads.some(l => l.id === leadId)) {
        currentStatus = status as LeadStatus;
        break;
      }
    }

    // Only update if status changed
    if (currentStatus && currentStatus !== newStatus && KANBAN_COLUMNS.includes(newStatus)) {
      onStatusChange(leadId, newStatus);
    }
  };

  // Find the active lead for the overlay
  const activeLead = activeId
    ? Object.values(leadsByStatus).flat().find(l => l.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)] sm:h-[calc(100vh-280px)]">
        {KANBAN_COLUMNS.map(status => (
          <DroppableColumn
            key={status}
            status={status}
            leads={leadsByStatus[status]}
          >
            <SortableContext
              items={leadsByStatus[status].map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {leadsByStatus[status].map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onEdit={onEdit}
                  onContact={onContact}
                  onScheduleFollowUp={onScheduleFollowUp}
                  onConvert={onConvert}
                  onMarkLost={onMarkLost}
                  onDelete={onDelete}
                  formatCurrency={formatCurrency}
                />
              ))}
            </SortableContext>
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <LeadCard
            lead={activeLead}
            formatCurrency={formatCurrency}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
