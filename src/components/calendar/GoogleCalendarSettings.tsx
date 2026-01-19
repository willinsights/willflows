import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, RefreshCw, Settings, Check, X, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { cn } from '@/lib/utils';

export function GoogleCalendarSettings() {
  const {
    connection,
    loading,
    syncing,
    connect,
    disconnect,
    updatePreferences,
    sync,
  } = useGoogleCalendar();

  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!connection?.is_connected) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Sincronizar com Google Calendar</p>
              <p className="text-sm text-muted-foreground">
                Veja e sincronize eventos bilateralmente
              </p>
            </div>
          </div>
          <Button onClick={connect} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Conectar Google Calendar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Connected state
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Calendar className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Google Calendar
                <Badge variant="default" className="bg-success text-xs">
                  Conectado
                </Badge>
              </CardTitle>
              <CardDescription>
                {connection.last_sync_at ? (
                  <>Última sincronização: {format(new Date(connection.last_sync_at), "d MMM 'às' HH:mm", { locale: pt })}</>
                ) : (
                  'Ainda não sincronizado'
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={sync}
              disabled={syncing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? 'A sincronizar...' : 'Sincronizar'}
            </Button>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Preferências de Sincronização</DialogTitle>
                  <DialogDescription>
                    Escolha o que sincronizar com o Google Calendar
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    WillFlow → Google Calendar
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_shoots" className="flex items-center gap-2">
                        📸 Captações (shoots)
                      </Label>
                      <Switch
                        id="sync_shoots"
                        checked={connection.sync_shoots}
                        onCheckedChange={(checked) => updatePreferences({ sync_shoots: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_deliveries" className="flex items-center gap-2">
                        🎬 Entregas
                      </Label>
                      <Switch
                        id="sync_deliveries"
                        checked={connection.sync_deliveries}
                        onCheckedChange={(checked) => updatePreferences({ sync_deliveries: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_meetings" className="flex items-center gap-2">
                        📅 Reuniões
                      </Label>
                      <Switch
                        id="sync_meetings"
                        checked={connection.sync_meetings}
                        onCheckedChange={(checked) => updatePreferences({ sync_meetings: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_events" className="flex items-center gap-2">
                        📌 Outros eventos
                      </Label>
                      <Switch
                        id="sync_events"
                        checked={connection.sync_events}
                        onCheckedChange={(checked) => updatePreferences({ sync_events: checked })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <p className="text-sm font-medium text-muted-foreground">
                    Google Calendar → WillFlow
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="import_from_google" className="flex flex-col">
                      <span>Importar eventos do Google</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Veja eventos externos no calendário WillFlow
                      </span>
                    </Label>
                    <Switch
                      id="import_from_google"
                      checked={connection.import_from_google}
                      onCheckedChange={(checked) => updatePreferences({ import_from_google: checked })}
                    />
                  </div>
                </div>

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Desconectar Google Calendar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desconectar Google Calendar?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Os eventos já sincronizados permanecerão no Google Calendar, mas não haverá mais sincronização automática.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          disconnect();
                          setSettingsOpen(false);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Desconectar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      {connection.sync_error && (
        <CardContent className="pt-0 space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm max-h-40 overflow-y-auto">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans text-sm flex-1">{connection.sync_error}</pre>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={sync}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            Tentar novamente
          </Button>
        </CardContent>
      )}
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          <SyncBadge enabled={connection.sync_shoots} label="Captações" />
          <SyncBadge enabled={connection.sync_deliveries} label="Entregas" />
          <SyncBadge enabled={connection.sync_meetings} label="Reuniões" />
          <SyncBadge enabled={connection.sync_events} label="Eventos" />
          <SyncBadge enabled={connection.import_from_google} label="Importar" />
        </div>
      </CardContent>
    </Card>
  );
}

function SyncBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge variant={enabled ? 'default' : 'secondary'} className="gap-1">
      {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </Badge>
  );
}
