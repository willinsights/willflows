// Centralized plan definitions - Single source of truth
// All plan-related information should import from this file

export type PlanId = 'starter' | 'pro' | 'studio';

// Database now uses 'starter' directly (was 'essencial')
// Keeping backward compatibility for any old data that might still have 'essencial'
export const PLAN_DB_MAPPING: Record<string, PlanId> = {
  'essencial': 'starter', // Legacy - backward compatibility
  'starter': 'starter',
  'pro': 'pro',
  'studio': 'studio',
};

export const PLAN_ID_TO_DB: Record<PlanId, string> = {
  'starter': 'starter', // Now uses 'starter' in DB
  'pro': 'pro',
  'studio': 'studio',
};

export interface PlanLimits {
  workspaces: number;
  users: number;
  projects: number;
  clients: number;
  storage: number; // in GB
}

export interface PlanPrices {
  eur: { monthly: number; yearly: number };
  brl: { monthly: number; yearly: number };
}

export type FeatureCategory = 'limit' | 'core' | 'export' | 'integration';

export interface PlanFeature {
  key: string;
  name: string;
  value: string | boolean;
  included: boolean;
  category: FeatureCategory;
}

export interface PlanInfo {
  id: PlanId;
  name: string;
  description: string;
  popular?: boolean;
  prices: PlanPrices;
  limits: PlanLimits;
  features: PlanFeature[];
  // Display strings for limits
  limitsDisplay: {
    workspaces: string;
    users: string;
    projects: string;
  };
}

// Plan limits - authoritative source
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: { workspaces: 1, users: 2, projects: 20, clients: 20, storage: 1 },
  pro: { workspaces: 3, users: 10, projects: 999, clients: 100, storage: 10 },
  studio: { workspaces: 10, users: 999, projects: 999, clients: 999, storage: 100 },
};

// Stripe Price IDs - LIVE PRODUCTION
export const STRIPE_PRICES = {
  starter: {
    eur: {
      monthly: 'price_1SrikWGr2lXbVyw9yonzyJlM',
      yearly: 'price_1SrikXGr2lXbVyw9NqSZ9svF',
    },
    brl: {
      monthly: 'price_1SrikZGr2lXbVyw9359CeNDt',
      yearly: 'price_1SrikZGr2lXbVyw9NI0jXQ52',
    },
    product_id: 'prod_TpNVDQjhG0wlZ4',
  },
  pro: {
    eur: {
      monthly: 'price_1SrikbGr2lXbVyw91Rz0i9zt',
      yearly: 'price_1SrikcGr2lXbVyw9uMfHWw6L',
    },
    brl: {
      monthly: 'price_1SrikcGr2lXbVyw9JDMREfdR',
      yearly: 'price_1SrikdGr2lXbVyw98tP1rsYd',
    },
    product_id: 'prod_TpNVjl9D0tQ8wQ',
  },
  studio: {
    eur: {
      monthly: 'price_1SrikfGr2lXbVyw9fXBV7BGs',
      yearly: 'price_1SrikfGr2lXbVyw9KpGstQ2S',
    },
    brl: {
      monthly: 'price_1SrikgGr2lXbVyw9Rt6xW57v',
      yearly: 'price_1SrikhGr2lXbVyw9JnFXF1E2',
    },
    product_id: 'prod_TpNVM1mlDtAvKA',
  },
} as const;

// Storage Addon Price IDs - LIVE PRODUCTION
// Note: +25GB addon needs to be created in Stripe and price_id updated here
export const STORAGE_ADDON_PRICES = {
  '25gb': {
    price_id: 'price_1SviwHGr2lXbVyw9V2L3pgY9',
    product_id: 'prod_TtVyg9RmLKqwRS',
    bytes: 25 * 1024 * 1024 * 1024,
    displayName: '+25 GB',
    price: { eur: 6, brl: 35 },
  },
  '50gb': {
    price_id: 'price_1SuuVQGr2lXbVyw9OybAtJ9i',
    product_id: 'prod_TsfrcvSlClixZM',
    bytes: 50 * 1024 * 1024 * 1024,
    displayName: '+50 GB',
    price: { eur: 10, brl: 59 },
  },
  '100gb': {
    price_id: 'price_1SuuVRGr2lXbVyw92Mnlgzj0',
    product_id: 'prod_TsfrGDXzlIOhaM',
    bytes: 100 * 1024 * 1024 * 1024,
    displayName: '+100 GB',
    price: { eur: 18, brl: 99 },
  },
  '250gb': {
    price_id: 'price_1SuuVSGr2lXbVyw9XhaYRv0T',
    product_id: 'prod_TsfrRubX5bCWEh',
    bytes: 250 * 1024 * 1024 * 1024,
    displayName: '+250 GB',
    price: { eur: 35, brl: 197 },
  },
} as const;

export type StorageAddonTier = '25gb' | '50gb' | '100gb' | '250gb';

export function getStorageAddonPrice(tier: StorageAddonTier, currency: Currency): number {
  return STORAGE_ADDON_PRICES[tier].price[currency];
}

export function getStorageAddonBytes(tier: StorageAddonTier): number {
  return STORAGE_ADDON_PRICES[tier].bytes;
}

// Full plan information with CORRECT annual prices
// Annual = monthly × 12 × 0.8 (20% discount)
// Annual per month = monthly × 0.8 (for display "X/mês quando pago anualmente")
export const PLANS: Record<PlanId, PlanInfo> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para freelancers e profissionais independentes',
    prices: {
      eur: { monthly: 14, yearly: 134 }, // 14 × 12 × 0.8 = 134.4 ≈ 134
      brl: { monthly: 79, yearly: 758 }, // 79 × 12 × 0.8 = 758.4 ≈ 758
    },
    limits: PLAN_LIMITS.starter,
    limitsDisplay: {
      workspaces: '1 workspace',
      users: 'Até 2 utilizadores',
      projects: '20 projetos ativos',
    },
    features: [
      { key: 'workspaces', name: 'Workspaces', value: '1', included: true, category: 'limit' },
      { key: 'users', name: 'Utilizadores', value: '2', included: true, category: 'limit' },
      { key: 'projects', name: 'Projetos ativos', value: '20', included: true, category: 'limit' },
      { key: 'clients', name: 'Clientes', value: '20', included: true, category: 'limit' },
      { key: 'kanban', name: 'Kanban Captação + Edição', value: true, included: true, category: 'core' },
      { key: 'crmBasic', name: 'CRM básico', value: true, included: true, category: 'core' },
      { key: 'calendar', name: 'Calendário integrado', value: true, included: true, category: 'core' },
      { key: 'chat', name: 'Chat interno', value: false, included: false, category: 'core' },
      { key: 'mediaHub', name: 'Media Hub', value: true, included: true, category: 'core' },
      { key: 'exportExcel', name: 'Exportação Excel', value: false, included: false, category: 'export' },
      { key: 'exportPdf', name: 'Exportação PDF', value: false, included: false, category: 'export' },
      { key: 'reportsBasic', name: 'Relatórios simples', value: true, included: true, category: 'core' },
      { key: 'financialReports', name: 'Relatórios financeiros', value: true, included: true, category: 'core' },
      { key: 'googleCalendar', name: 'Google Calendar', value: false, included: false, category: 'integration' },
      { key: 'googleMeet', name: 'Meet integrado', value: false, included: false, category: 'integration' },
      { key: 'reportsAdvanced', name: 'Relatórios avançados', value: false, included: false, category: 'core' },
      { key: 'templates', name: 'Templates de projeto', value: false, included: false, category: 'core' },
      { key: 'frameio', name: 'Frame.io', value: false, included: false, category: 'integration' },
      { key: 'automations', name: 'Automações', value: false, included: false, category: 'core' },
      { key: 'api', name: 'API & Webhooks', value: false, included: false, category: 'integration' },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para equipas em crescimento',
    popular: true,
    prices: {
      eur: { monthly: 24, yearly: 230 }, // 24 × 12 × 0.8 = 230.4 ≈ 230
      brl: { monthly: 149, yearly: 1430 }, // 149 × 12 × 0.8 = 1430.4 ≈ 1430
    },
    limits: PLAN_LIMITS.pro,
    limitsDisplay: {
      workspaces: 'Até 3 workspaces',
      users: 'Até 10 utilizadores',
      projects: 'Projetos ilimitados',
    },
    features: [
      { key: 'workspaces', name: 'Workspaces', value: '3', included: true, category: 'limit' },
      { key: 'users', name: 'Utilizadores', value: '10', included: true, category: 'limit' },
      { key: 'projects', name: 'Projetos ativos', value: 'Ilimitados', included: true, category: 'limit' },
      { key: 'clients', name: 'Clientes', value: '100', included: true, category: 'limit' },
      { key: 'kanban', name: 'Kanban Captação + Edição', value: true, included: true, category: 'core' },
      { key: 'crmComplete', name: 'CRM completo', value: true, included: true, category: 'core' },
      { key: 'calendar', name: 'Calendário integrado', value: true, included: true, category: 'core' },
      { key: 'chat', name: 'Chat interno', value: true, included: true, category: 'core' },
      { key: 'mediaHub', name: 'Media Hub', value: true, included: true, category: 'core' },
      { key: 'exportExcel', name: 'Exportação Excel', value: true, included: true, category: 'export' },
      { key: 'exportPdf', name: 'Exportação PDF', value: true, included: true, category: 'export' },
      { key: 'financialReports', name: 'Relatórios financeiros', value: true, included: true, category: 'core' },
      { key: 'reportsAdvanced', name: 'Relatórios avançados', value: true, included: true, category: 'core' },
      { key: 'googleCalendar', name: 'Google Calendar', value: true, included: true, category: 'integration' },
      { key: 'googleMeet', name: 'Meet integrado', value: true, included: true, category: 'integration' },
      { key: 'templates', name: 'Templates de projeto', value: true, included: true, category: 'core' },
      { key: 'frameio', name: 'Frame.io', value: false, included: false, category: 'integration' },
      { key: 'automations', name: 'Automações avançadas', value: false, included: false, category: 'core' },
      { key: 'api', name: 'API & Webhooks', value: false, included: false, category: 'integration' },
    ],
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    description: 'Para agências e produtoras',
    prices: {
      eur: { monthly: 42, yearly: 403 }, // 42 × 12 × 0.8 = 403.2 ≈ 403
      brl: { monthly: 247, yearly: 2371 }, // 247 × 12 × 0.8 = 2371.2 ≈ 2371
    },
    limits: PLAN_LIMITS.studio,
    limitsDisplay: {
      workspaces: 'Até 10 workspaces',
      users: 'Utilizadores ilimitados',
      projects: 'Projetos ilimitados',
    },
    features: [
      { key: 'workspaces', name: 'Workspaces', value: '10', included: true, category: 'limit' },
      { key: 'users', name: 'Utilizadores', value: 'Ilimitados', included: true, category: 'limit' },
      { key: 'projects', name: 'Projetos ativos', value: 'Ilimitados', included: true, category: 'limit' },
      { key: 'clients', name: 'Clientes', value: 'Ilimitados', included: true, category: 'limit' },
      { key: 'kanban', name: 'Kanban Captação + Edição', value: true, included: true, category: 'core' },
      { key: 'crmComplete', name: 'CRM completo', value: true, included: true, category: 'core' },
      { key: 'calendar', name: 'Calendário integrado', value: true, included: true, category: 'core' },
      { key: 'chat', name: 'Chat interno', value: true, included: true, category: 'core' },
      { key: 'mediaHub', name: 'Media Hub', value: true, included: true, category: 'core' },
      { key: 'exportExcel', name: 'Exportação Excel', value: true, included: true, category: 'export' },
      { key: 'exportPdf', name: 'Exportação PDF', value: true, included: true, category: 'export' },
      { key: 'financialReports', name: 'Relatórios financeiros', value: true, included: true, category: 'core' },
      { key: 'reportsAdvanced', name: 'Relatórios avançados', value: true, included: true, category: 'core' },
      { key: 'googleCalendar', name: 'Google Calendar', value: true, included: true, category: 'integration' },
      { key: 'googleMeet', name: 'Meet integrado', value: true, included: true, category: 'integration' },
      { key: 'templates', name: 'Templates de projeto', value: true, included: true, category: 'core' },
      { key: 'frameio', name: 'Frame.io integrado', value: true, included: true, category: 'integration' },
      { key: 'automations', name: 'Automações avançadas', value: true, included: true, category: 'core' },
      { key: 'permissions', name: 'Permissões avançadas', value: true, included: true, category: 'core' },
      { key: 'api', name: 'API & Webhooks', value: true, included: true, category: 'integration' },
      { key: 'videoApproval', name: 'Aprovação de vídeo', value: true, included: true, category: 'core' },
      { key: 'videoStorage', name: 'Armazenamento de vídeos', value: '10GB', included: true, category: 'limit' },
    ],
  },
};

// Helper functions
export type Currency = 'eur' | 'brl';
export type BillingInterval = 'monthly' | 'yearly';

export function getPriceId(plan: PlanId, currency: Currency, interval: BillingInterval): string {
  return STRIPE_PRICES[plan][currency][interval];
}

export function getProductId(plan: PlanId): string {
  return STRIPE_PRICES[plan].product_id;
}

export function getPlanLimits(plan: PlanId | string): PlanLimits {
  const normalizedPlan = PLAN_DB_MAPPING[plan] || 'starter';
  return PLAN_LIMITS[normalizedPlan];
}

export function getPlanInfo(plan: PlanId | string): PlanInfo {
  const normalizedPlan = PLAN_DB_MAPPING[plan] || 'starter';
  return PLANS[normalizedPlan];
}

export function getDisplayPlanName(plan: string): string {
  const normalizedPlan = PLAN_DB_MAPPING[plan] || 'starter';
  return PLANS[normalizedPlan].name;
}

// Plan order for comparison
export const PLAN_ORDER: PlanId[] = ['starter', 'pro', 'studio'];

export function isPlanAtLeast(userPlan: string, requiredPlan: PlanId): boolean {
  const normalizedUserPlan = PLAN_DB_MAPPING[userPlan] || 'starter';
  const userIndex = PLAN_ORDER.indexOf(normalizedUserPlan);
  const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);
  return userIndex >= requiredIndex;
}

// ----- DISPLAY HELPERS -----

/**
 * Get the monthly price (for display)
 * If yearly, returns the monthly equivalent with discount applied
 */
export function getDisplayPrice(planId: PlanId, currency: Currency, interval: BillingInterval): number {
  const plan = PLANS[planId];
  if (interval === 'yearly') {
    // Monthly price with 20% discount
    return Math.round(plan.prices[currency].monthly * 0.8);
  }
  return plan.prices[currency].monthly;
}

/**
 * Get the total yearly price
 */
export function getYearlyTotal(planId: PlanId, currency: Currency): number {
  return PLANS[planId].prices[currency].yearly;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return currency === 'eur' ? '€' : 'R$';
}

/**
 * Get features for display, categorized
 */
export function getPlanDisplayFeatures(planId: PlanId): {
  limits: PlanFeature[];
  included: PlanFeature[];
  excluded: PlanFeature[];
} {
  const features = PLANS[planId].features;
  return {
    limits: features.filter(f => f.category === 'limit'),
    included: features.filter(f => f.included && f.category !== 'limit'),
    excluded: features.filter(f => !f.included),
  };
}

/**
 * Get a simplified feature list for compact display
 * Returns the most important features for the plan
 */
export function getCompactFeatures(planId: PlanId): string[] {
  const plan = PLANS[planId];
  
  switch (planId) {
    case 'starter':
      return ['Kanban', 'CRM básico', 'Excel export'];
    case 'pro':
      return ['Tudo do Starter', 'Google Calendar', 'Meet', 'PDF'];
    case 'studio':
      return ['Tudo do Pro', 'Frame.io', 'Automações', 'API'];
    default:
      return plan.features.filter(f => f.included).slice(0, 4).map(f => f.name);
  }
}

/**
 * Get display-ready plan for UI cards
 */
export interface DisplayPlan {
  id: PlanId;
  name: string;
  description: string;
  popular: boolean;
  priceMonthly: number;
  priceAnnualMonthly: number; // Monthly price when billed annually
  priceAnnualTotal: number;
  limits: {
    workspaces: string;
    users: string;
    projects: string;
  };
  features: Array<{ name: string; included: boolean }>;
}

export function getDisplayPlans(currency: Currency): DisplayPlan[] {
  return PLAN_ORDER.map(planId => {
    const plan = PLANS[planId];
    const featuresForDisplay = plan.features
      .filter(f => f.category !== 'limit')
      .map(f => ({ name: f.name, included: f.included }));

    return {
      id: planId,
      name: plan.name,
      description: plan.description,
      popular: plan.popular || false,
      priceMonthly: plan.prices[currency].monthly,
      priceAnnualMonthly: Math.round(plan.prices[currency].monthly * 0.8),
      priceAnnualTotal: plan.prices[currency].yearly,
      limits: plan.limitsDisplay,
      features: featuresForDisplay,
    };
  });
}

// For backwards compatibility - re-export as PLAN_INFO
export const PLAN_INFO = PLANS;
