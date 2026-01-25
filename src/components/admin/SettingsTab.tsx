import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { toast } from 'sonner';
import { Loader2, Save, Settings } from 'lucide-react';

export function SettingsTab() {
  const { settings, isLoading, updateTrialSettings } = useSystemSettings();
  
  const [trialDays, setTrialDays] = useState<number>(30);
  const [warningDays, setWarningDays] = useState<number>(2);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.trial) {
      setTrialDays(settings.trial.default_days);
      setWarningDays(settings.trial.warning_days);
    }
  }, [settings]);

  const handleSave = async () => {
    if (trialDays < 1 || trialDays > 365) {
      toast.error('Dias de trial deve estar entre 1 e 365');
      return;
    }
    if (warningDays < 0 || warningDays >= trialDays) {
      toast.error('Dias de aviso deve ser menor que dias de trial');
      return;
    }

    setIsSaving(true);
    try {
      await updateTrialSettings.mutateAsync({
        default_days: trialDays,
        warning_days: warningDays,
      });
      toast.success('Configurações guardadas');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao guardar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Trial
          </CardTitle>
          <CardDescription>
            Configurar duração padrão do período de teste para novos workspaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trial-days">Dias de Trial (padrão)</Label>
              <Input
                id="trial-days"
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 30)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Número de dias de teste para novos utilizadores (1-365)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warning-days">Dias de Aviso</Label>
              <Input
                id="warning-days"
                type="number"
                min={0}
                max={30}
                value={warningDays}
                onChange={(e) => setWarningDays(parseInt(e.target.value) || 2)}
                placeholder="2"
              />
              <p className="text-xs text-muted-foreground">
                Mostrar aviso quando faltarem X dias para expirar
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Alterações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores Atuais</CardTitle>
          <CardDescription>
            Configurações atualmente em vigor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Trial Padrão</p>
              <p className="text-2xl font-bold">{settings?.trial.default_days ?? 30} dias</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Aviso de Expiração</p>
              <p className="text-2xl font-bold">{settings?.trial.warning_days ?? 2} dias antes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
