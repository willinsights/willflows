import { motion } from 'framer-motion';
import { Calendar, Video, ExternalLink, Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePlanFeatures, type FeatureKey } from '@/hooks/usePlanFeatures';
import { UpgradeAlert } from '@/components/subscription/UpgradeAlert';

interface AccountIntegrationsTabProps {
  planName: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  featureKey?: FeatureKey;
  comingSoon?: boolean;
}

// Mapeamento de integração para feature key
const integrationToFeature: Record<string, FeatureKey> = {
  'google-calendar': 'googleCalendar',
  'google-meet': 'googleMeet',
};

export function AccountIntegrationsTab({ planName }: AccountIntegrationsTabProps) {
  const { canUseFeature, checkFeature, upgradeAlert, closeUpgradeAlert, currentPlan, getRequiredPlan } = usePlanFeatures();

  const integrations: Integration[] = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sincronize eventos e datas de shoot',
      icon: <Calendar className="h-5 w-5" />,
      connected: false,
      featureKey: 'googleCalendar',
    },
    {
      id: 'google-meet',
      name: 'Google Meet',
      description: 'Links de reunião automáticos',
      icon: <Video className="h-5 w-5" />,
      connected: false,
      featureKey: 'googleMeet',
    },
  ];

  const canUseIntegration = (integration: Integration) => {
    const featureKey = integrationToFeature[integration.id];
    if (!featureKey) return true;
    return canUseFeature(featureKey);
  };

  const handleUpgradeClick = (integration: Integration) => {
    const featureKey = integrationToFeature[integration.id];
    if (featureKey) {
      checkFeature(featureKey);
    }
  };

  const getRequiredPlanForIntegration = (integration: Integration): string | undefined => {
    const featureKey = integrationToFeature[integration.id];
    if (featureKey) {
      return getRequiredPlan(featureKey);
    }
    return undefined;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Conecte serviços externos para melhorar o seu fluxo de trabalho.
      </p>

      <div className="space-y-2">
        {integrations.map((integration, index) => {
          const hasAccess = canUseIntegration(integration);
          const requiredPlan = getRequiredPlanForIntegration(integration);
          
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
                    {!hasAccess && requiredPlan && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Requer plano {requiredPlan.charAt(0).toUpperCase()}{requiredPlan.slice(1)}</p>
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
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1"
                  onClick={() => handleUpgradeClick(integration)}
                >
                  <Crown className="h-3 w-3" />
                  Upgrade
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* UpgradeAlert Modal */}
      <UpgradeAlert
        isOpen={upgradeAlert.isOpen}
        onClose={closeUpgradeAlert}
        feature={upgradeAlert.feature}
        requiredPlan={upgradeAlert.requiredPlan}
        currentPlan={currentPlan}
        isLimitReached={upgradeAlert.isLimitReached}
      />
    </div>
  );
}
