import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { VideoStructure, UpdateSegmentInput } from '@/hooks/useVideoStructure';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  min_duration_seconds: z.number().min(1, 'Mínimo 1 segundo'),
  max_duration_seconds: z.number().optional().nullable(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditSegmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: VideoStructure | null;
  onUpdate: (id: string, data: UpdateSegmentInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditSegmentModal({ open, onOpenChange, segment, onUpdate, onDelete }: EditSegmentModalProps) {
  const [isRange, setIsRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (segment && open) {
      setValue('name', segment.name);
      setValue('description', segment.description || '');
      setValue('min_duration_seconds', segment.min_duration_seconds);
      setValue('max_duration_seconds', segment.max_duration_seconds);
      setValue('notes', segment.notes || '');
      setIsRange(!!segment.max_duration_seconds && segment.max_duration_seconds !== segment.min_duration_seconds);
    }
  }, [segment, open, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!segment) return;
    
    setLoading(true);
    try {
      await onUpdate(segment.id, {
        name: data.name,
        description: data.description,
        min_duration_seconds: data.min_duration_seconds,
        max_duration_seconds: isRange ? data.max_duration_seconds : null,
        notes: data.notes,
      });
      onOpenChange(false);
    } catch {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!segment) return;
    
    setLoading(true);
    try {
      await onDelete(segment.id);
      setShowDeleteDialog(false);
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

  if (!segment) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Segmento</DialogTitle>
            <DialogDescription>
              Modifique os detalhes deste segmento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                placeholder="Ex: Introdução, Ação, Detalhes..."
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                placeholder="Breve descrição do segmento"
                {...register('description')}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-isRange"
                  checked={isRange}
                  onCheckedChange={(checked) => setIsRange(!!checked)}
                />
                <Label htmlFor="edit-isRange" className="text-sm font-normal cursor-pointer">
                  Usar intervalo de duração (ex: 4-6 segundos)
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-min_duration">{isRange ? 'Mínimo (segundos)' : 'Duração (segundos)'}</Label>
                  <Input
                    id="edit-min_duration"
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
                    <Label htmlFor="edit-max_duration">Máximo (segundos)</Label>
                    <Input
                      id="edit-max_duration"
                      type="number"
                      min={1}
                      {...register('max_duration_seconds', { valueAsNumber: true })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea
                id="edit-notes"
                placeholder="Notas adicionais para o editor..."
                rows={2}
                {...register('notes')}
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={() => handleClose(false)} className="flex-1 sm:flex-none">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
                  {loading ? 'A guardar...' : 'Guardar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar segmento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O segmento "{segment.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {loading ? 'A apagar...' : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
