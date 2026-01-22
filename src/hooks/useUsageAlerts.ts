import { useMemo } from 'react';
import { usePlanFeatures } from './usePlanFeatures';

export interface UsageAlert {
  type: 'warning' | 'critical' | 'blocked';
  resource: 'workspaces' | 'users' | 'projects' | 'clients';
  current: number;
  limit: number;
  percentage: number;
  message: string;
  ctaLabel: string;
}

const resourceLabels = {
  workspaces: { singular: 'workspace', plural: 'workspaces' },
  users: { singular: 'utilizador', plural: 'utilizadores' },
  projects: { singular: 'projeto', plural: 'projetos' },
  clients: { singular: 'cliente', plural: 'clientes' },
};

export function useUsageAlerts() {
  const { usage, limits } = usePlanFeatures();
  
  const alerts = useMemo<UsageAlert[]>(() => {
    const result: UsageAlert[] = [];
    
    const resources = ['workspaces', 'users', 'projects', 'clients'] as const;
    
    for (const resource of resources) {
      const current = usage[resource];
      const limit = limits[resource];
      
      // Skip if limit is very high (essentially unlimited)
      if (limit >= 999) continue;
      
      const percentage = (current / limit) * 100;
      const remaining = limit - current;
      const labels = resourceLabels[resource];
      
      let type: 'warning' | 'critical' | 'blocked' | null = null;
      let message = '';
      let ctaLabel = 'Fazer upgrade';
      
      if (percentage >= 100) {
        type = 'blocked';
        message = `Limite de ${labels.plural} atingido! Não é possível adicionar mais.`;
        ctaLabel = 'Desbloquear mais';
      } else if (percentage >= 90) {
        type = 'critical';
        message = `Apenas ${remaining} ${remaining === 1 ? labels.singular : labels.plural} restante${remaining === 1 ? '' : 's'}.`;
        ctaLabel = 'Aumentar limite';
      } else if (percentage >= 80) {
        type = 'warning';
        message = `A aproximar-se do limite de ${labels.plural} (${remaining} disponíve${remaining === 1 ? 'l' : 'is'}).`;
        ctaLabel = 'Ver opções';
      }
      
      if (type) {
        result.push({
          type,
          resource,
          current,
          limit,
          percentage,
          message,
          ctaLabel,
        });
      }
    }
    
    // Sort by severity (blocked > critical > warning)
    const severityOrder = { blocked: 0, critical: 1, warning: 2 };
    return result.sort((a, b) => severityOrder[a.type] - severityOrder[b.type]);
  }, [usage, limits]);
  
  const hasAlerts = alerts.length > 0;
  const mostSevereAlert = alerts[0] || null;
  const blockedResources = alerts.filter(a => a.type === 'blocked');
  const hasBlockedResources = blockedResources.length > 0;
  
  return {
    alerts,
    hasAlerts,
    mostSevereAlert,
    blockedResources,
    hasBlockedResources,
  };
}