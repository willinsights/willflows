import { useMemo, useCallback, useState } from 'react';
import { useUserSubscription, SubscriptionPlan } from './useUserSubscription';
import { 
  PLANS, 
  PLAN_DB_MAPPING, 
  isPlanAtLeast as isPlanAtLeastFromPlans,
  type PlanId,
} from '@/lib/plans';

// Re-export SubscriptionPlan for backwards compatibility
export type { SubscriptionPlan };

// Feature keys derived from plans.ts - includes all possible feature keys
export type FeatureKey =
  | 'workspaces'
  | 'users'
  | 'projects'
  | 'kanban'
  | 'crmBasic'
  | 'crmComplete'
  | 'calendar'
  | 'exportExcel'
  | 'exportPdf'
  | 'reportsBasic'
  | 'reportsAdvanced'
  | 'googleCalendar'
  | 'googleMeet'
  | 'templates'
  | 'frameio'
  | 'automations'
  | 'permissions'
  | 'api';

export interface FeatureInfo {
  key: FeatureKey;
  name: string;
  description: string;
  minimumPlan: SubscriptionPlan;
}

// Build features from plans.ts - determines minimum plan for each feature
function buildFeatureInfo(): Record<FeatureKey, FeatureInfo> {
  const featureDescriptions: Record<string, string> = {
    workspaces: 'Criar múltiplos workspaces',
    users: 'Convidar membros para a equipa',
    projects: 'Criar projetos',
    kanban: 'Gestão de projetos em Kanban',
    crmBasic: 'Gestão básica de clientes',
    crmComplete: 'Funcionalidades avançadas de CRM',
    calendar: 'Calendário integrado com projetos',
    exportExcel: 'Exportar dados para Excel/CSV',
    exportPdf: 'Exportar relatórios e documentos em PDF',
    reportsBasic: 'Relatórios e métricas simples',
    reportsAdvanced: 'Análises detalhadas e dashboards personalizados',
    googleCalendar: 'Sincronização com Google Calendar',
    googleMeet: 'Criar reuniões automaticamente',
    templates: 'Templates de projeto personalizados',
    frameio: 'Integração com Frame.io para revisão de vídeos',
    automations: 'Fluxos de trabalho automatizados',
    permissions: 'Permissões avançadas por cargo',
    api: 'Acesso à API e Webhooks',
  };

  const features: Partial<Record<FeatureKey, FeatureInfo>> = {};
  
  // Determine minimum plan for each feature by checking when it first becomes available
  const planOrder: PlanId[] = ['starter', 'pro', 'studio'];
  
  planOrder.forEach(planId => {
    const plan = PLANS[planId];
    const dbPlan = planId === 'starter' ? 'essencial' : planId;
    
    plan.features.forEach(feature => {
      const featureKey = feature.key as FeatureKey;
      
      // Only set if not already set AND feature is included in this plan
      if (!features[featureKey] && feature.included) {
        features[featureKey] = {
          key: featureKey,
          name: feature.name,
          description: featureDescriptions[featureKey] || feature.name,
          minimumPlan: dbPlan as SubscriptionPlan,
        };
      }
    });
  });

  // Add any features that are never included (use studio as default)
  Object.keys(featureDescriptions).forEach(key => {
    if (!features[key as FeatureKey]) {
      features[key as FeatureKey] = {
        key: key as FeatureKey,
        name: key,
        description: featureDescriptions[key],
        minimumPlan: 'studio',
      };
    }
  });

  return features as Record<FeatureKey, FeatureInfo>;
}

const FEATURES = buildFeatureInfo();

// DB uses 'essencial', UI sometimes uses 'starter' - normalize for comparison
function normalizePlan(plan: string): PlanId {
  return PLAN_DB_MAPPING[plan] || 'starter';
}

function isPlanAtLeast(userPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan): boolean {
  const requiredPlanId = normalizePlan(requiredPlan);
  return isPlanAtLeastFromPlans(userPlan, requiredPlanId);
}

export interface UpgradeAlertState {
  isOpen: boolean;
  feature: FeatureInfo | null;
  requiredPlan: SubscriptionPlan | null;
  isLimitReached: boolean;
}

export function usePlanFeatures() {
  const { subscription, limits, usage, loading, refresh } = useUserSubscription();
  const [upgradeAlert, setUpgradeAlert] = useState<UpgradeAlertState>({
    isOpen: false,
    feature: null,
    requiredPlan: null,
    isLimitReached: false,
  });

  const currentPlan = subscription?.plan || 'essencial';

  // Check if user can use a specific feature (boolean check only)
  const canUseFeature = useCallback((feature: FeatureKey): boolean => {
    const featureInfo = FEATURES[feature];
    if (!featureInfo) return false;

    // For limit-based features, check current usage
    if (feature === 'workspaces') {
      return usage.workspaces < limits.workspaces;
    }
    if (feature === 'users') {
      return usage.users < limits.users;
    }
    if (feature === 'projects') {
      return usage.projects < limits.projects;
    }

    // For boolean features, check plan level
    return isPlanAtLeast(currentPlan, featureInfo.minimumPlan);
  }, [currentPlan, usage, limits]);

  // Check if user has access to a feature (plan level, ignoring limits)
  const hasFeatureAccess = useCallback((feature: FeatureKey): boolean => {
    const featureInfo = FEATURES[feature];
    if (!featureInfo) return false;
    return isPlanAtLeast(currentPlan, featureInfo.minimumPlan);
  }, [currentPlan]);

  // Get the minimum plan required for a feature
  const getRequiredPlan = useCallback((feature: FeatureKey): SubscriptionPlan => {
    return FEATURES[feature]?.minimumPlan || 'pro';
  }, []);

  // Get upgrade plan recommendation
  const getUpgradePlan = useCallback((feature: FeatureKey): SubscriptionPlan => {
    const requiredPlan = getRequiredPlan(feature);
    
    const planOrderDb: SubscriptionPlan[] = ['essencial', 'pro', 'studio'];
    const requiredIndex = planOrderDb.indexOf(requiredPlan);
    const userIndex = planOrderDb.indexOf(currentPlan);
    
    // If user's plan is below required, suggest the required plan
    if (userIndex < requiredIndex) {
      return requiredPlan;
    }
    
    // If it's a limit issue, suggest the next plan up
    const nextPlanIndex = Math.min(userIndex + 1, planOrderDb.length - 1);
    return planOrderDb[nextPlanIndex];
  }, [currentPlan, getRequiredPlan]);

  // Check feature and show upgrade alert if not available
  const checkFeature = useCallback((feature: FeatureKey): boolean => {
    if (canUseFeature(feature)) {
      return true;
    }

    const featureInfo = FEATURES[feature];
    const requiredPlan = getUpgradePlan(feature);
    
    // Determine if it's a limit issue vs plan issue
    const isLimitReached = ['workspaces', 'users', 'projects'].includes(feature) && 
      isPlanAtLeast(currentPlan, featureInfo.minimumPlan);

    setUpgradeAlert({
      isOpen: true,
      feature: featureInfo,
      requiredPlan,
      isLimitReached,
    });

    return false;
  }, [canUseFeature, getUpgradePlan, currentPlan]);

  // Close upgrade alert
  const closeUpgradeAlert = useCallback(() => {
    setUpgradeAlert({
      isOpen: false,
      feature: null,
      requiredPlan: null,
      isLimitReached: false,
    });
  }, []);

  // Get remaining quota for limit-based features
  const getRemainingQuota = useCallback((feature: 'workspaces' | 'users' | 'projects') => {
    return Math.max(0, limits[feature] - usage[feature]);
  }, [limits, usage]);

  // Get feature info
  const getFeatureInfo = useCallback((feature: FeatureKey): FeatureInfo => {
    return FEATURES[feature];
  }, []);

  // All features with their availability status
  const features = useMemo(() => {
    return Object.keys(FEATURES).reduce((acc, key) => {
      const featureKey = key as FeatureKey;
      acc[featureKey] = {
        ...FEATURES[featureKey],
        available: canUseFeature(featureKey),
        hasAccess: hasFeatureAccess(featureKey),
      };
      return acc;
    }, {} as Record<FeatureKey, FeatureInfo & { available: boolean; hasAccess: boolean }>);
  }, [canUseFeature, hasFeatureAccess]);

  return {
    // Current plan info
    currentPlan,
    subscription,
    limits,
    usage,
    loading,
    refresh,
    
    // Feature checks
    features,
    canUseFeature,
    hasFeatureAccess,
    checkFeature,
    getRequiredPlan,
    getUpgradePlan,
    getRemainingQuota,
    getFeatureInfo,
    
    // Upgrade alert state
    upgradeAlert,
    closeUpgradeAlert,
  };
}
