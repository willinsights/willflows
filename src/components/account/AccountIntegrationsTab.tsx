import { motion } from 'framer-motion';
import { Calendar, Video, Cloud, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AccountIntegrationsTabProps {
  planName: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  requiredPlan?: string;
  comingSoon?: boolean;
}

export function AccountIntegrationsTab({ planName }: AccountIntegrationsTabProps) {
  const integrations: Integration[] = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sincronize eventos e datas de shoot',
      icon: <Calendar className="h-5 w-5" />,
      connected: false,
      comingSoon: true,
    },
    {
      id: 'frameio',
      name: 'Frame.io',
      description: 'Revisão de vídeos com clientes',
      icon: <Video className="h-5 w-5" />,
      connected: false,
      requiredPlan: 'studio',
      comingSoon: true,
    },
    {
      id: 'drive',
      name: 'Google Drive',
      description: 'Sincronize pastas de projetos',
      icon: <Cloud className="h-5 w-5" />,
      connected: false,
      comingSoon: true,
    },
  ];

  const canUseIntegration = (integration: Integration) => {
    if (!integration.requiredPlan) return true;
    const planOrder = ['essencial', 'pro', 'studio'];
    return planOrder.indexOf(planName) >= planOrder.indexOf(integration.requiredPlan);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Conecte serviços externos para melhorar o seu fluxo de trabalho.
      </p>

      <div className="space-y-2">
        {integrations.map((integration, index) => {
          const hasAccess = canUseIntegration(integration);
          
          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-all',
                hasAccess ? 'border-border' : 'border-border/50 opacity-60'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  integration.connected 
                    ? 'bg-success/10 text-success' 
                    : 'bg-muted text-muted-foreground'
                )}>
                  {integration.icon}
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {integration.name}
                    {!hasAccess && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Requer plano {integration.requiredPlan?.charAt(0).toUpperCase()}{integration.requiredPlan?.slice(1)}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
              </div>
              
              {integration.comingSoon ? (
                <Badge variant="secondary" className="text-xs">
                  Em breve
                </Badge>
              ) : integration.connected ? (
                <Badge variant="default" className="bg-success text-xs">
                  Conectado
                </Badge>
              ) : hasAccess ? (
                <Button size="sm" variant="outline" className="gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Conectar
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled className="gap-1">
                  <Lock className="h-3 w-3" />
                  Upgrade
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
