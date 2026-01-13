// Centralized plan definitions - Single source of truth
// All plan-related information should import from this file

export type PlanId = 'starter' | 'pro' | 'studio';

// Database uses 'essencial' but UI uses 'starter' - this maps between them
export const PLAN_DB_MAPPING: Record<string, PlanId> = {
  'essencial': 'starter',
  'starter': 'starter',
  'pro': 'pro',
  'studio': 'studio',
};

export const PLAN_ID_TO_DB: Record<PlanId, string> = {
  'starter': 'essencial',
  'pro': 'pro',
  'studio': 'studio',
};

export interface PlanLimits {
  workspaces: number;
  users: number;
  projects: number;
}

export interface PlanPrices {
  eur: { monthly: number; yearly: number };
  brl: { monthly: number; yearly: number };
}

export interface PlanFeature {
  name: string;
  value: string | boolean;
  included: boolean;
}

export interface PlanInfo {
  id: PlanId;
  name: string;
  description: string;
  popular?: boolean;
  prices: PlanPrices;
  limits: PlanLimits;
  features: PlanFeature[];
}

// Plan limits - authoritative source
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: { workspaces: 1, users: 2, projects: 20 },
  pro: { workspaces: 3, users: 10, projects: 999 },
  studio: { workspaces: 10, users: 999, projects: 999 },
};

// Stripe Price IDs
export const STRIPE_PRICES = {
  starter: {
    eur: {
      monthly: 'price_1SnadaGuTRnB7JCLGGHL4Ru2',
      yearly: 'price_1SnadqGuTRnB7JCLWCP258CR',
    },
    brl: {
      monthly: 'price_1SnadwGuTRnB7JCLjowstEIV',
      yearly: 'price_1SnadxGuTRnB7JCL3QAmVujq',
    },
    product_id: 'prod_Tl6rw16ZNqHrWd',
  },
  pro: {
    eur: {
      monthly: 'price_1SnadzGuTRnB7JCL3pro5G3S',
      yearly: 'price_1Snae1GuTRnB7JCLShZh5dmz',
    },
    brl: {
      monthly: 'price_1Snae2GuTRnB7JCLl2ECVsKS',
      yearly: 'price_1Snae4GuTRnB7JCLMQSuINEu',
    },
    product_id: 'prod_Tl6rsZkoz6yqYu',
  },
  studio: {
    eur: {
      monthly: 'price_1Snae6GuTRnB7JCLWnrkIkrW',
      yearly: 'price_1Snae7GuTRnB7JCLYUGXT2Gi',
    },
    brl: {
      monthly: 'price_1Snae9GuTRnB7JCLP27ypl43',
      yearly: 'price_1SnaeBGuTRnB7JCLntkQu4Kx',
    },
    product_id: 'prod_Tl6rxTvnCICjTL',
  },
} as const;

// Full plan information
export const PLANS: Record<PlanId, PlanInfo> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para freelancers e profissionais independentes',
    prices: {
      eur: { monthly: 14, yearly: 134.40 },
      brl: { monthly: 79, yearly: 758.40 },
    },
    limits: PLAN_LIMITS.starter,
    features: [
      { name: 'Workspaces', value: '1', included: true },
      { name: 'Utilizadores', value: '2', included: true },
      { name: 'Projetos ativos', value: '20', included: true },
      { name: 'Kanban Captação + Edição', value: true, included: true },
      { name: 'CRM básico', value: true, included: true },
      { name: 'Export Excel', value: true, included: true },
      { name: 'Export PDF', value: false, included: false },
      { name: 'Google Calendar', value: false, included: false },
      { name: 'Google Meet', value: false, included: false },
      { name: 'Relatórios avançados', value: false, included: false },
      { name: 'Frame.io', value: false, included: false },
      { name: 'Automações', value: false, included: false },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para equipas em crescimento',
    popular: true,
    prices: {
      eur: { monthly: 24, yearly: 230.40 },
      brl: { monthly: 149, yearly: 1430.40 },
    },
    limits: PLAN_LIMITS.pro,
    features: [
      { name: 'Workspaces', value: '3', included: true },
      { name: 'Utilizadores', value: '10', included: true },
      { name: 'Projetos ativos', value: 'Ilimitados', included: true },
      { name: 'Kanban Captação + Edição', value: true, included: true },
      { name: 'CRM completo', value: true, included: true },
      { name: 'Export Excel', value: true, included: true },
      { name: 'Export PDF', value: true, included: true },
      { name: 'Google Calendar', value: true, included: true },
      { name: 'Google Meet', value: true, included: true },
      { name: 'Relatórios avançados', value: true, included: true },
      { name: 'Frame.io', value: false, included: false },
      { name: 'Automações', value: false, included: false },
    ],
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    description: 'Para agências e produtoras',
    prices: {
      eur: { monthly: 32, yearly: 307.20 },
      brl: { monthly: 197, yearly: 1891.20 },
    },
    limits: PLAN_LIMITS.studio,
    features: [
      { name: 'Workspaces', value: '10', included: true },
      { name: 'Utilizadores', value: 'Ilimitados', included: true },
      { name: 'Projetos ativos', value: 'Ilimitados', included: true },
      { name: 'Kanban Captação + Edição', value: true, included: true },
      { name: 'CRM completo', value: true, included: true },
      { name: 'Export Excel', value: true, included: true },
      { name: 'Export PDF', value: true, included: true },
      { name: 'Google Calendar', value: true, included: true },
      { name: 'Google Meet', value: true, included: true },
      { name: 'Relatórios avançados', value: true, included: true },
      { name: 'Frame.io', value: true, included: true },
      { name: 'Automações', value: true, included: true },
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

// For backwards compatibility - re-export as PLAN_INFO
export const PLAN_INFO = PLANS;
