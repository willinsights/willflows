import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useToast } from '@/hooks/use-toast';

interface EmailPreference {
  key: keyof Pick<
    ReturnType<typeof useUserPreferences>['preferences'],
    'email_project_updates' | 'email_payment_reminders' | 'email_team_activity' | 'email_weekly_summary' | 'email_marketing'
  >;
  label: string;
  description: string;
}

const emailPreferences: EmailPreference[] = [
  { 
    key: 'email_project_updates', 
    label: 'Atualizações de Projetos', 
    description: 'Receber notificações sobre projetos atribuídos' 
  },
  { 
    key: 'email_payment_reminders', 
    label: 'Lembretes de Pagamento', 
    description: 'Alertas de datas de vencimento de pagamentos' 
  },
  { 
    key: 'email_team_activity', 
    label: 'Atividade da Equipa', 
    description: 'Novos membros e alterações na equipa' 
  },
  { 
    key: 'email_weekly_summary', 
    label: 'Resumo Semanal', 
    description: 'Email com métricas e resumo da semana' 
  },
  { 
    key: 'email_marketing', 
    label: 'Novidades e Dicas', 
    description: 'Novidades do WillFlow e dicas de produtividade' 
  },
];

export function EmailPreferencesCard() {
  const { preferences, loading, saving, updatePreferences } = useUserPreferences();
  const { toast } = useToast();

  const handleToggle = async (key: EmailPreference['key'], value: boolean) => {
    const result = await updatePreferences({ [key]: value });
    
    if (!result.success) {
      toast({
        title: 'Erro ao guardar',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Preferências de Email
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Preferências de Email
        </CardTitle>
        <CardDescription>Escolha quais emails deseja receber</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {emailPreferences.map((pref) => (
          <div key={pref.key} className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor={pref.key} className="font-medium cursor-pointer">
                {pref.label}
              </Label>
              <p className="text-sm text-muted-foreground">{pref.description}</p>
            </div>
            <Switch
              id={pref.key}
              checked={preferences?.[pref.key] ?? false}
              onCheckedChange={(checked) => handleToggle(pref.key, checked)}
              disabled={saving}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
