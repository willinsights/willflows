import { useState } from 'react';
import { Mail, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const roleOptions: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'captacao', label: 'Captação' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'visualizador', label: 'Visualizador' },
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue placeholder="Selecionar role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={loading || !email.trim()} className="w-full gradient-primary">
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
