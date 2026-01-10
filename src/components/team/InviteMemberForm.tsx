import { useState } from 'react';
import { Mail, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleOptions: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Acesso total ao workspace' },
  { value: 'editor', label: 'Editor', description: 'Gerir projetos e tarefas' },
  { value: 'captacao', label: 'Captação', description: 'Apenas fase de captação' },
  { value: 'freelancer', label: 'Freelancer', description: 'Apenas projetos atribuídos' },
  { value: 'visualizador', label: 'Visualizador', description: 'Apenas visualização' },
];

interface InviteMemberFormProps {
  onSuccess?: () => void;
}

export function InviteMemberForm({ onSuccess }: InviteMemberFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('editor');
  const [loading, setLoading] = useState(false);
  const { createInvitation } = useWorkspaceInvitations();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await createInvitation(email.trim(), role);
      if (error) throw error;

      toast({
        title: 'Convite enviado',
        description: `Convite enviado para ${email}`,
      });

      setEmail('');
      setRole('editor');
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar convite',
        description: err.message || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="email"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-9"
          required
        />
      </div>
      <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Selecionar role" />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={loading || !email.trim()} className="gradient-primary">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar
          </>
        )}
      </Button>
    </form>
  );
}
