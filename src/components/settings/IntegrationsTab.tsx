import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video } from 'lucide-react';

export function IntegrationsTab() {
  return (
          <div className="grid gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Google Calendar
                </CardTitle>
                <CardDescription>Sincronize eventos com o Google Calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Não conectado</p>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Google Meet
                </CardTitle>
                <CardDescription>Links de reunião automáticos ao agendar eventos e comunicações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Activo</p>
                  </div>
                  <Badge variant="default" className="bg-success text-xs">Activo</Badge>
                </div>
              </CardContent>
            </Card>

          </div>
  );
}
