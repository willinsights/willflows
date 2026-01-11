import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Loader2 } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreference {
  key: keyof Pick<
    ReturnType<typeof useUserPreferences>['preferences'],
    'notify_new_project' | 'notify_task_assigned' | 'notify_payment_received' | 'notify_deadline_reminder' | 'notify_team_updates'
  >;
  label: string;
  description: string;
}

const notificationPreferences: NotificationPreference[] = [
  { 
    key: 'notify_new_project', 
    label: 'Novo Projeto', 
    description: 'Quando um projeto é criado no workspace' 
  },
  { 
    key: 'notify_task_assigned', 
    label: 'Tarefa Atribuída', 
    description: 'Quando uma tarefa lhe é atribuída' 
  },
  { 
    key: 'notify_payment_received', 
    label: 'Pagamento Recebido', 
    description: 'Quando um pagamento é registado' 
  },
  { 
    key: 'notify_deadline_reminder', 
    label: 'Lembrete de Deadline', 
    description: 'Aviso antes de datas limite de projetos' 
  },
  { 
    key: 'notify_team_updates', 
    label: 'Atualizações de Equipa', 
    description: 'Entradas e saídas de membros' 
  },
];

export function NotificationPreferencesCard() {
  const { preferences, loading, saving, updatePreferences } = useUserPreferences();
  const { toast } = useToast();

  const handleToggle = async (key: NotificationPreference['key'], value: boolean) => {
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
            <Bell className="h-5 w-5" />
            Notificações
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
          <Bell className="h-5 w-5" />
          Notificações
        </CardTitle>
        <CardDescription>Preferências de alertas e avisos no sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificationPreferences.map((pref) => (
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
