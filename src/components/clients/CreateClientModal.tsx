import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClients } from '@/hooks/useClients';
import { appToast } from '@/hooks/useAppToast';

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  company: z.string().min(2, 'Empresa é obrigatória'),
  nif: z.string().min(1, 'Tax ID é obrigatório'),
  address: z.string().min(5, 'Morada fiscal é obrigatória'),
  postal_code: z.string().min(3, 'Código postal é obrigatório'),
  country: z.string().min(2, 'País é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
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
      nif: '',
      address: '',
      postal_code: '',
      country: '',
      email: '',
      phone: '',
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true);
    
    const client = await createClient({
      name: data.name,
      company: data.company,
      nif: data.nif,
      address: data.address,
      postal_code: data.postal_code,
      country: data.country,
      email: data.email,
      phone: data.phone || null,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome do contacto"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Empresa */}
          <div className="space-y-2">
            <Label htmlFor="company">Nome da Empresa *</Label>
            <Input
              id="company"
              placeholder="Nome da empresa"
              {...form.register('company')}
            />
            {form.formState.errors.company && (
              <p className="text-sm text-destructive">
                {form.formState.errors.company.message}
              </p>
            )}
          </div>

          {/* Tax ID com Tooltip */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="nif">Tax ID *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Número fiscal do país (ex.: NIF, VAT, CNPJ, CPF, EIN…)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="nif"
              placeholder="Ex: 123456789"
              {...form.register('nif')}
            />
            {form.formState.errors.nif && (
              <p className="text-sm text-destructive">
                {form.formState.errors.nif.message}
              </p>
            )}
          </div>

          {/* Morada Fiscal */}
          <div className="space-y-2">
            <Label htmlFor="address">Morada Fiscal *</Label>
            <Input
              id="address"
              placeholder="Rua, número, andar..."
              {...form.register('address')}
            />
            {form.formState.errors.address && (
              <p className="text-sm text-destructive">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>

          {/* Código Postal e País */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal *</Label>
              <Input
                id="postal_code"
                placeholder="1000-001"
                {...form.register('postal_code')}
              />
              {form.formState.errors.postal_code && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.postal_code.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País *</Label>
              <Input
                id="country"
                placeholder="Portugal"
                {...form.register('country')}
              />
              {form.formState.errors.country && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.country.message}
                </p>
              )}
            </div>
          </div>

          {/* Email de Faturação */}
          <div className="space-y-2">
            <Label htmlFor="email">Email de Faturação *</Label>
            <Input
              id="email"
              type="email"
              placeholder="faturacao@empresa.pt"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Contacto Telefónico</Label>
            <Input
              id="phone"
              placeholder="+351 912 345 678"
              {...form.register('phone')}
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
