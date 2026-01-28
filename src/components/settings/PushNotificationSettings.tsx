import { Bell, BellOff, Calendar, Clock, AlertTriangle, MessageSquare, Volume2, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { isBadgeSupported } from '@/hooks/usePWABadge';

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    preferences,
    loading,
    isSubscribed,
    requestPermission,
    updatePreferences,
  } = usePushNotifications();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O seu browser não suporta notificações push. Tente usar o Chrome, Firefox ou Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const needsPermission = permission !== 'granted';
  const isDenied = permission === 'denied';

  const badgeSupported = isBadgeSupported();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
          {isSubscribed && (
            <Badge variant="secondary" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Receba alertas sobre eventos próximos e prazos de entrega
          {badgeSupported && " • O ícone da app mostra o número de notificações não lidas"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isDenied ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              As notificações foram bloqueadas no seu browser. Para ativar, aceda às definições do browser e permita notificações para este site.
            </AlertDescription>
          </Alert>
        ) : needsPermission ? (
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="font-medium">Ativar notificações</p>
              <p className="text-sm text-muted-foreground">
                Permita notificações para receber alertas mesmo quando o app está fechado
              </p>
            </div>
            <Button onClick={requestPermission}>
              Permitir
            </Button>
          </div>
        ) : null}

        <div className="space-y-4">
          {/* Master toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-enabled" className="font-medium">
                Notificações ativas
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações push no browser
              </p>
            </div>
            <Switch
              id="push-enabled"
              checked={preferences?.push_enabled ?? false}
              onCheckedChange={(checked) => updatePreferences({ push_enabled: checked })}
              disabled={needsPermission}
            />
          </div>

          {preferences?.push_enabled && !needsPermission && (
            <>
              <div className="border-t pt-4 space-y-4">
                {/* Messages toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label htmlFor="messages-enabled">Mensagens de chat</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas para novas mensagens
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="messages-enabled"
                    checked={preferences.messages_enabled}
                    onCheckedChange={(checked) => updatePreferences({ messages_enabled: checked })}
                  />
                </div>

                {/* Events toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label htmlFor="events-enabled">Eventos</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas para gravações e reuniões
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="events-enabled"
                    checked={preferences.events_enabled}
                    onCheckedChange={(checked) => updatePreferences({ events_enabled: checked })}
                  />
                </div>

                {/* Deadlines toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label htmlFor="deadlines-enabled">Prazos de entrega</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas para entregas pendentes
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="deadlines-enabled"
                    checked={preferences.deadlines_enabled}
                    onCheckedChange={(checked) => updatePreferences({ deadlines_enabled: checked })}
                  />
                </div>

                {/* Sound toggle - Prominent and easy to access */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label htmlFor="sound-enabled" className="font-medium">Som de notificação</Label>
                      <p className="text-sm text-muted-foreground">
                        Ouvir som quando receber mensagens
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="sound-enabled"
                    checked={preferences.sound_enabled}
                    onCheckedChange={(checked) => updatePreferences({ sound_enabled: checked })}
                  />
                </div>

                {/* Advance hours */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Antecedência do alerta</Label>
                    <p className="text-sm text-muted-foreground">
                      Quanto tempo antes do evento notificar
                    </p>
                  </div>
                  <Select
                    value={String(preferences.advance_hours)}
                    onValueChange={(value) => updatePreferences({ advance_hours: parseInt(value) })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="2">2 horas</SelectItem>
                      <SelectItem value="6">6 horas</SelectItem>
                      <SelectItem value="12">12 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
