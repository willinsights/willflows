import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { CreateSegmentInput } from '@/hooks/useVideoStructure';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  min_duration_seconds: z.number().min(1, 'Mínimo 1 segundo'),
  max_duration_seconds: z.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddSegmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: CreateSegmentInput) => Promise<void>;
}

export function AddSegmentModal({ open, onOpenChange, onAdd }: AddSegmentModalProps) {
  const [isRange, setIsRange] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      min_duration_seconds: 5,
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await onAdd({
        name: data.name,
        description: data.description,
        min_duration_seconds: data.min_duration_seconds,
        max_duration_seconds: isRange ? data.max_duration_seconds : undefined,
        notes: data.notes,
      });
      reset();
      setIsRange(false);
      onOpenChange(false);
    } catch {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setIsRange(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Segmento</DialogTitle>
          <DialogDescription>
            Defina um novo segmento para a estrutura do vídeo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Ex: Introdução, Ação, Detalhes..."
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Breve descrição do segmento"
              {...register('description')}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isRange"
                checked={isRange}
                onCheckedChange={(checked) => setIsRange(!!checked)}
              />
              <Label htmlFor="isRange" className="text-sm font-normal cursor-pointer">
                Usar intervalo de duração (ex: 4-6 segundos)
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_duration">{isRange ? 'Mínimo (segundos)' : 'Duração (segundos)'}</Label>
                <Input
                  id="min_duration"
                  type="number"
                  min={1}
                  {...register('min_duration_seconds', { valueAsNumber: true })}
                />
                {errors.min_duration_seconds && (
                  <p className="text-xs text-destructive">{errors.min_duration_seconds.message}</p>
                )}
              </div>

              {isRange && (
                <div className="space-y-2">
                  <Label htmlFor="max_duration">Máximo (segundos)</Label>
                  <Input
                    id="max_duration"
                    type="number"
                    min={1}
                    {...register('max_duration_seconds', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionais para o editor..."
              rows={2}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'A adicionar...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
