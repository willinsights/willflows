// Stripe Price IDs for all plans, currencies, and billing intervals
// Updated with new pricing: Starter €14/R$79, Pro €24/R$149, Studio €32/R$197

export const STRIPE_PRICES = {
  starter: {
    eur: {
      monthly: 'price_1SnadaGuTRnB7JCLGGHL4Ru2', // €14/month
      yearly: 'price_1SnadqGuTRnB7JCLWCP258CR',  // €134.40/year (€11.20/month)
    },
    brl: {
      monthly: 'price_1SnadwGuTRnB7JCLjowstEIV', // R$79/month
      yearly: 'price_1SnadxGuTRnB7JCL3QAmVujq',  // R$758.40/year (R$63.20/month)
    },
    product_id: 'prod_Tl6rw16ZNqHrWd',
  },
  pro: {
    eur: {
      monthly: 'price_1SnadzGuTRnB7JCL3pro5G3S', // €24/month
      yearly: 'price_1Snae1GuTRnB7JCLShZh5dmz',  // €230.40/year (€19.20/month)
    },
    brl: {
      monthly: 'price_1Snae2GuTRnB7JCLl2ECVsKS', // R$149/month
      yearly: 'price_1Snae4GuTRnB7JCLMQSuINEu',  // R$1430.40/year (R$119.20/month)
    },
    product_id: 'prod_Tl6rsZkoz6yqYu',
  },
  studio: {
    eur: {
      monthly: 'price_1Snae6GuTRnB7JCLWnrkIkrW', // €32/month
      yearly: 'price_1Snae7GuTRnB7JCLYUGXT2Gi',  // €307.20/year (€25.60/month)
    },
    brl: {
      monthly: 'price_1Snae9GuTRnB7JCLP27ypl43', // R$197/month
      yearly: 'price_1SnaeBGuTRnB7JCLntkQu4Kx',  // R$1891.20/year (R$157.60/month)
    },
    product_id: 'prod_Tl6rxTvnCICjTL',
  },
} as const;

export type PlanId = keyof typeof STRIPE_PRICES;
export type Currency = 'eur' | 'brl';
export type BillingInterval = 'monthly' | 'yearly';

export function getPriceId(plan: PlanId, currency: Currency, interval: BillingInterval): string {
  return STRIPE_PRICES[plan][currency][interval];
}

export function getProductId(plan: PlanId): string {
  return STRIPE_PRICES[plan].product_id;
}

// Plan display information
export const PLAN_INFO = {
  starter: {
    name: 'Starter',
    description: 'Para freelancers e pequenas equipas',
    prices: {
      eur: { monthly: 14, yearly: 134.40 },
      brl: { monthly: 79, yearly: 758.40 },
    },
    limits: {
      workspaces: 1,
      users: 2,
      projects: 20,
    },
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
    name: 'Pro',
    description: 'Para equipas em crescimento',
    popular: true,
    prices: {
      eur: { monthly: 24, yearly: 230.40 },
      brl: { monthly: 149, yearly: 1430.40 },
    },
    limits: {
      workspaces: 3,
      users: 10,
      projects: 'Ilimitados',
    },
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
    name: 'Studio',
    description: 'Para agências e produtoras',
    prices: {
      eur: { monthly: 32, yearly: 307.20 },
      brl: { monthly: 197, yearly: 1891.20 },
    },
    limits: {
      workspaces: 10,
      users: 'Ilimitados',
      projects: 'Ilimitados',
    },
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
} as const;
