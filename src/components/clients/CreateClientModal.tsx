import { useState } from 'react';
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
import { useClients } from '@/hooks/useClients';
import { appToast } from '@/hooks/useAppToast';

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  company: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (client: any) => void;
}

export function CreateClientModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateClientModalProps) {
  const { createClient } = useClients();
  const [loading, setLoading] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      city: '',
      notes: '',
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true);
    
    const client = await createClient({
      name: data.name,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      city: data.city || null,
      notes: data.notes || null,
    });

    setLoading(false);

    if (client) {
      form.reset();
      onOpenChange(false);
      appToast.clientCreated(data.name);
      onSuccess?.(client);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome do cliente"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              placeholder="Nome da empresa"
              {...form.register('company')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.pt"
                {...form.register('email')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="+351 912 345 678"
                {...form.register('phone')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              placeholder="Lisboa"
              {...form.register('city')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Observações..."
              {...form.register('notes')}
              rows={2}
            />
          </div>

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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Criar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
