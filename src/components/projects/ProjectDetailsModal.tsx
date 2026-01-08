import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { X, Edit, Trash2, CheckCircle, Calendar, MapPin, User, Euro, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProjectWithClient } from '@/hooks/useKanban';

interface ProjectDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithClient | null;
  onUpdate: () => void;
}

const priorityLabels = {
  baixa: 'Baixa',
  media: 'Média', 
  alta: 'Alta',
  urgente: 'Urgente',
};

const priorityClasses = {
  baixa: 'priority-baixa',
  media: 'priority-media',
  alta: 'priority-alta',
  urgente: 'priority-urgente',
};

export function ProjectDetailsModal({ open, onOpenChange, project, onUpdate }: ProjectDetailsModalProps) {
  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{project.name}</span>
            <Badge className={priorityClasses[project.priority]}>
              {priorityLabels[project.priority]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="space-y-6 pr-4">
            {/* Project Code */}
            {(project as any).project_code && (
              <div>
                <span className="text-sm text-muted-foreground">ID do Projeto:</span>
                <p className="font-mono text-primary">{(project as any).project_code}</p>
              </div>
            )}

            {/* Client */}
            {project.clients?.name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{project.clients.name}</span>
              </div>
            )}

            {/* Location */}
            {project.city && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{project.city}</span>
              </div>
            )}

            <Separator />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {project.shoot_date && (
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Data de Captação
                  </span>
                  <p className="font-medium">
                    {format(new Date(project.shoot_date), 'dd/MM/yyyy', { locale: pt })}
                  </p>
                </div>
              )}
              {project.delivery_date && (
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Data de Entrega
                  </span>
                  <p className="font-medium">
                    {format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Financial */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground">Preço Cliente</span>
                <p className="text-lg font-bold text-success">
                  €{(project.agreed_value || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground">Custos</span>
                <p className="text-lg font-bold text-destructive">
                  €{(((project as any).custo_captacao || 0) + ((project as any).custo_edicao || 0)).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground">Lucro</span>
                <p className="text-lg font-bold text-primary">
                  €{((project.agreed_value || 0) - ((project as any).custo_captacao || 0) - ((project as any).custo_edicao || 0)).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Notes */}
            {project.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground">Notas</span>
                  <p className="mt-1 whitespace-pre-wrap">{project.notes}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button className="gradient-primary">
            <CheckCircle className="h-4 w-4 mr-2" />
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
