import { useMemo, useCallback, useState } from 'react';
import { useUserSubscription, SubscriptionPlan } from './useUserSubscription';

export type FeatureKey =
  | 'workspaces'
  | 'users'
  | 'projects'
  | 'exportPdf'
  | 'googleCalendar'
  | 'googleMeet'
  | 'advancedReports'
  | 'frameio'
  | 'automations'
  | 'crmComplete';

export interface FeatureInfo {
  key: FeatureKey;
  name: string;
  description: string;
  minimumPlan: SubscriptionPlan;
}

// Features and their minimum plan requirements
const FEATURES: Record<FeatureKey, FeatureInfo> = {
  workspaces: {
    key: 'workspaces',
    name: 'Workspaces',
    description: 'Criar múltiplos workspaces',
    minimumPlan: 'essencial',
  },
  users: {
    key: 'users',
    name: 'Utilizadores',
    description: 'Convidar membros para a equipa',
    minimumPlan: 'essencial',
  },
  projects: {
    key: 'projects',
    name: 'Projetos',
    description: 'Criar projetos',
    minimumPlan: 'essencial',
  },
  exportPdf: {
    key: 'exportPdf',
    name: 'Export PDF',
    description: 'Exportar relatórios e documentos em PDF',
    minimumPlan: 'pro',
  },
  googleCalendar: {
    key: 'googleCalendar',
    name: 'Google Calendar',
    description: 'Integração com Google Calendar',
    minimumPlan: 'pro',
  },
  googleMeet: {
    key: 'googleMeet',
    name: 'Google Meet',
    description: 'Criar reuniões automaticamente',
    minimumPlan: 'pro',
  },
  advancedReports: {
    key: 'advancedReports',
    name: 'Relatórios Avançados',
    description: 'Análises detalhadas e dashboards personalizados',
    minimumPlan: 'pro',
  },
  frameio: {
    key: 'frameio',
    name: 'Frame.io',
    description: 'Integração com Frame.io para revisão de vídeos',
    minimumPlan: 'studio',
  },
  automations: {
    key: 'automations',
    name: 'Automações',
    description: 'Fluxos de trabalho automatizados',
    minimumPlan: 'studio',
  },
  crmComplete: {
    key: 'crmComplete',
    name: 'CRM Completo',
    description: 'Funcionalidades avançadas de CRM',
    minimumPlan: 'pro',
  },
};

const PLAN_ORDER: SubscriptionPlan[] = ['essencial', 'pro', 'studio'];

function isPlanAtLeast(userPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan): boolean {
  const userIndex = PLAN_ORDER.indexOf(userPlan);
  const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);
  return userIndex >= requiredIndex;
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
    const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);
    const userIndex = PLAN_ORDER.indexOf(currentPlan);
    
    // If user's plan is below required, suggest the required plan
    if (userIndex < requiredIndex) {
      return requiredPlan;
    }
    
    // If it's a limit issue, suggest the next plan up
    const nextPlanIndex = Math.min(userIndex + 1, PLAN_ORDER.length - 1);
    return PLAN_ORDER[nextPlanIndex];
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
