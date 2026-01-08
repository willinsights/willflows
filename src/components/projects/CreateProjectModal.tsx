import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import type { KanbanPhase } from '@/hooks/useKanban';

const projectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  type: z.enum(['fotografia', 'video', 'foto_video']),
  category: z.enum(['hotel', 'experiencia', 'evento', 'outro']),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']),
  client_id: z.string().optional(),
  shoot_date: z.string().optional(),
  delivery_date: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultColumnId?: string | null;
  phase: KanbanPhase;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  onSuccess,
  defaultColumnId,
  phase,
}: CreateProjectModalProps) {
  const { createProject } = useProjects();
  const { clients, loading: clientsLoading } = useClients();
  const [loading, setLoading] = useState(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      type: 'fotografia',
      category: 'outro',
      priority: 'media',
      client_id: '',
      shoot_date: '',
      delivery_date: '',
      city: '',
      notes: '',
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    
    const project = await createProject({
      name: data.name,
      type: data.type,
      category: data.category,
      priority: data.priority,
      client_id: data.client_id || null,
      shoot_date: data.shoot_date || null,
      delivery_date: data.delivery_date || null,
      city: data.city || null,
      notes: data.notes || null,
    });

    setLoading(false);

    if (project) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do projeto *</Label>
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

          {/* Type and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => form.setValue('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fotografia">Fotografia</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="foto_video">Foto + Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="experiencia">Experiência</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={form.watch('client_id') || ''}
                onValueChange={(value) => form.setValue('client_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de captação</Label>
              <Input
                type="date"
                {...form.register('shoot_date')}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de entrega</Label>
              <Input
                type="date"
                {...form.register('delivery_date')}
              />
            </div>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              placeholder="Ex: Lisboa"
              {...form.register('city')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observações sobre o projeto..."
              {...form.register('notes')}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
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
      </DialogContent>
    </Dialog>
  );
}
