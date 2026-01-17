import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Zap, Clock, Save, Play, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useBlogAutoSettings } from "@/hooks/useBlogAutoSettings";
import { cn } from "@/lib/utils";

export function BlogAutoSettings() {
  const { settings, isLoading, updateSettings, isUpdating, triggerManualRun } = useBlogAutoSettings();
  const [isTriggering, setIsTriggering] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [localSettings, setLocalSettings] = useState({
    is_enabled: false,
    articles_per_day: 1,
    auto_publish: false,
    schedule_hour: 9,
    schedule_minute: 0,
    preferred_topics: [] as string[],
  });

  const [topicsInput, setTopicsInput] = useState("");

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        is_enabled: settings.is_enabled,
        articles_per_day: settings.articles_per_day,
        auto_publish: settings.auto_publish,
        schedule_hour: settings.schedule_hour,
        schedule_minute: settings.schedule_minute,
        preferred_topics: settings.preferred_topics || [],
      });
      setTopicsInput((settings.preferred_topics || []).join(", "));
    }
  }, [settings]);

  const handleSave = () => {
    const topics = topicsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    updateSettings({
      ...localSettings,
      preferred_topics: topics,
    });
  };

  const handleTriggerManual = async () => {
    setIsTriggering(true);
    await triggerManualRun();
    setIsTriggering(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Geração Automática</CardTitle>
                  <CardDescription>Configura a geração automática de artigos</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {settings?.is_enabled && (
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full font-medium">
                    Ativo
                  </span>
                )}
                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Trigger Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerManual}
                disabled={isTriggering}
              >
                {isTriggering ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Gerar Agora
              </Button>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativar geração automática</Label>
                <p className="text-sm text-muted-foreground">
                  Gera artigos automaticamente todos os dias
                </p>
              </div>
              <Switch
                checked={localSettings.is_enabled}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({ ...prev, is_enabled: checked }))
                }
              />
            </div>

            {/* Articles per day */}
            <div className="space-y-2">
              <Label>Artigos por dia</Label>
              <Select
                value={localSettings.articles_per_day.toString()}
                onValueChange={(value) =>
                  setLocalSettings((prev) => ({ ...prev, articles_per_day: parseInt(value) }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? "artigo" : "artigos"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Time */}
            <div className="space-y-2">
              <Label>Hora de publicação</Label>
              <div className="flex gap-2 items-center">
                <Select
                  value={localSettings.schedule_hour.toString()}
                  onValueChange={(value) =>
                    setLocalSettings((prev) => ({ ...prev, schedule_hour: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">:</span>
                <Select
                  value={localSettings.schedule_minute.toString()}
                  onValueChange={(value) =>
                    setLocalSettings((prev) => ({ ...prev, schedule_minute: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min) => (
                      <SelectItem key={min} value={min.toString()}>
                        {min.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Auto Publish */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Publicar automaticamente</Label>
                <p className="text-sm text-muted-foreground">
                  Publica os artigos sem revisão manual
                </p>
              </div>
              <Switch
                checked={localSettings.auto_publish}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({ ...prev, auto_publish: checked }))
                }
              />
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label>Tópicos preferidos</Label>
              <Input
                placeholder="fotografia, video, gestão de projetos"
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separa os tópicos por vírgula
              </p>
            </div>

            {/* Last/Next Run */}
            {settings && (
              <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground border-t">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Última execução:{" "}
                    {settings.last_run_at
                      ? format(new Date(settings.last_run_at), "d MMM yyyy 'às' HH:mm", { locale: pt })
                      : "Nunca"}
                  </span>
                </div>
              </div>
            )}

            {/* Save Button */}
            <Button onClick={handleSave} disabled={isUpdating} className="w-full">
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Configuração
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
