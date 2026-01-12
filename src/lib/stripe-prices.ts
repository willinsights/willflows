// Re-export from centralized plans file for backwards compatibility
// This file is deprecated - import from '@/lib/plans' instead

export { 
  STRIPE_PRICES,
  PLANS as PLAN_INFO,
  getPriceId,
  getProductId,
  type PlanId,
  type Currency,
  type BillingInterval,
} from './plans';
