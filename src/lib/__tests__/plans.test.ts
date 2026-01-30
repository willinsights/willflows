import { describe, it, expect } from 'vitest';
import {
  PLANS,
  PLAN_LIMITS,
  PLAN_ORDER,
  PLAN_DB_MAPPING,
  isPlanAtLeast,
  getPlanLimits,
  getPlanInfo,
  getDisplayPlanName,
  getPriceId,
  getProductId,
  STRIPE_PRICES,
  type PlanId,
} from '../plans';

describe('plans.ts - Plan Configuration', () => {
  describe('PLAN_LIMITS', () => {
    it('should have correct limits for Starter plan', () => {
      expect(PLAN_LIMITS.starter).toEqual({
        workspaces: 1,
        users: 2,
        projects: 20,
        clients: 20,
        storage: 1,
      });
    });

    it('should have correct limits for Pro plan', () => {
      expect(PLAN_LIMITS.pro).toEqual({
        workspaces: 3,
        users: 10,
        projects: 999,
        clients: 100,
        storage: 10,
      });
    });

    it('should have correct limits for Studio plan', () => {
      expect(PLAN_LIMITS.studio).toEqual({
        workspaces: 10,
        users: 999,
        projects: 999,
        clients: 999,
        storage: 100,
      });
    });
  });

  describe('Plan Feature Gating - CRITICAL', () => {
    it('Starter: mediaHub should be TRUE (included)', () => {
      const starterFeatures = PLANS.starter.features;
      const mediaHub = starterFeatures.find(f => f.key === 'mediaHub');
      expect(mediaHub?.included).toBe(true);
      expect(mediaHub?.value).toBe(true);
    });

    it('Starter: financialReports should be TRUE (included)', () => {
      const starterFeatures = PLANS.starter.features;
      const financialReports = starterFeatures.find(f => f.key === 'financialReports');
      expect(financialReports?.included).toBe(true);
      expect(financialReports?.value).toBe(true);
    });

    it('Starter: chat should be FALSE (not included)', () => {
      const starterFeatures = PLANS.starter.features;
      const chat = starterFeatures.find(f => f.key === 'chat');
      expect(chat?.included).toBe(false);
      expect(chat?.value).toBe(false);
    });

    it('Starter: exportExcel should be FALSE (not included)', () => {
      const starterFeatures = PLANS.starter.features;
      const exportExcel = starterFeatures.find(f => f.key === 'exportExcel');
      expect(exportExcel?.included).toBe(false);
    });

    it('Starter: exportPdf should be FALSE (not included)', () => {
      const starterFeatures = PLANS.starter.features;
      const exportPdf = starterFeatures.find(f => f.key === 'exportPdf');
      expect(exportPdf?.included).toBe(false);
    });

    it('Starter: googleCalendar should be FALSE (not included)', () => {
      const starterFeatures = PLANS.starter.features;
      const googleCalendar = starterFeatures.find(f => f.key === 'googleCalendar');
      expect(googleCalendar?.included).toBe(false);
    });

    it('Pro: chat should be TRUE (included)', () => {
      const proFeatures = PLANS.pro.features;
      const chat = proFeatures.find(f => f.key === 'chat');
      expect(chat?.included).toBe(true);
    });

    it('Pro: exportExcel should be TRUE (included)', () => {
      const proFeatures = PLANS.pro.features;
      const exportExcel = proFeatures.find(f => f.key === 'exportExcel');
      expect(exportExcel?.included).toBe(true);
    });

    it('Pro: exportPdf should be TRUE (included)', () => {
      const proFeatures = PLANS.pro.features;
      const exportPdf = proFeatures.find(f => f.key === 'exportPdf');
      expect(exportPdf?.included).toBe(true);
    });

    it('Pro: googleCalendar should be TRUE (included)', () => {
      const proFeatures = PLANS.pro.features;
      const googleCalendar = proFeatures.find(f => f.key === 'googleCalendar');
      expect(googleCalendar?.included).toBe(true);
    });

    it('Pro: videoApproval should be FALSE (not included)', () => {
      const proFeatures = PLANS.pro.features;
      const videoApproval = proFeatures.find(f => f.key === 'videoApproval');
      expect(videoApproval).toBeUndefined(); // Not in Pro features list
    });

    it('Studio: videoApproval should be TRUE (included)', () => {
      const studioFeatures = PLANS.studio.features;
      const videoApproval = studioFeatures.find(f => f.key === 'videoApproval');
      expect(videoApproval?.included).toBe(true);
    });

    it('Studio: api should be TRUE (included)', () => {
      const studioFeatures = PLANS.studio.features;
      const api = studioFeatures.find(f => f.key === 'api');
      expect(api?.included).toBe(true);
    });

    it('Studio: frameio should be TRUE (included)', () => {
      const studioFeatures = PLANS.studio.features;
      const frameio = studioFeatures.find(f => f.key === 'frameio');
      expect(frameio?.included).toBe(true);
    });
  });

  describe('isPlanAtLeast', () => {
    it('starter >= starter should be true', () => {
      expect(isPlanAtLeast('starter', 'starter')).toBe(true);
    });

    it('starter >= pro should be false', () => {
      expect(isPlanAtLeast('starter', 'pro')).toBe(false);
    });

    it('starter >= studio should be false', () => {
      expect(isPlanAtLeast('starter', 'studio')).toBe(false);
    });

    it('pro >= starter should be true', () => {
      expect(isPlanAtLeast('pro', 'starter')).toBe(true);
    });

    it('pro >= pro should be true', () => {
      expect(isPlanAtLeast('pro', 'pro')).toBe(true);
    });

    it('pro >= studio should be false', () => {
      expect(isPlanAtLeast('pro', 'studio')).toBe(false);
    });

    it('studio >= starter should be true', () => {
      expect(isPlanAtLeast('studio', 'starter')).toBe(true);
    });

    it('studio >= pro should be true', () => {
      expect(isPlanAtLeast('studio', 'pro')).toBe(true);
    });

    it('studio >= studio should be true', () => {
      expect(isPlanAtLeast('studio', 'studio')).toBe(true);
    });

    it('should handle legacy "essencial" plan as starter', () => {
      expect(isPlanAtLeast('essencial', 'starter')).toBe(true);
      expect(isPlanAtLeast('essencial', 'pro')).toBe(false);
    });

    it('should handle unknown plan as starter', () => {
      expect(isPlanAtLeast('unknown_plan', 'starter')).toBe(true);
      expect(isPlanAtLeast('unknown_plan', 'pro')).toBe(false);
    });
  });

  describe('PLAN_DB_MAPPING', () => {
    it('should map essencial to starter (backward compatibility)', () => {
      expect(PLAN_DB_MAPPING['essencial']).toBe('starter');
    });

    it('should map starter to starter', () => {
      expect(PLAN_DB_MAPPING['starter']).toBe('starter');
    });

    it('should map pro to pro', () => {
      expect(PLAN_DB_MAPPING['pro']).toBe('pro');
    });

    it('should map studio to studio', () => {
      expect(PLAN_DB_MAPPING['studio']).toBe('studio');
    });
  });

  describe('getPlanLimits', () => {
    it('should return correct limits for starter', () => {
      expect(getPlanLimits('starter')).toEqual(PLAN_LIMITS.starter);
    });

    it('should handle legacy essencial as starter', () => {
      expect(getPlanLimits('essencial')).toEqual(PLAN_LIMITS.starter);
    });

    it('should default to starter for unknown plan', () => {
      expect(getPlanLimits('unknown')).toEqual(PLAN_LIMITS.starter);
    });
  });

  describe('getPlanInfo', () => {
    it('should return full plan info for valid plan', () => {
      const info = getPlanInfo('pro');
      expect(info.id).toBe('pro');
      expect(info.name).toBe('Pro');
      expect(info.popular).toBe(true);
    });

    it('should default to starter for unknown plan', () => {
      const info = getPlanInfo('unknown');
      expect(info.id).toBe('starter');
    });
  });

  describe('getDisplayPlanName', () => {
    it('should return display name for valid plan', () => {
      expect(getDisplayPlanName('starter')).toBe('Starter');
      expect(getDisplayPlanName('pro')).toBe('Pro');
      expect(getDisplayPlanName('studio')).toBe('Studio');
    });

    it('should handle legacy essencial as Starter', () => {
      expect(getDisplayPlanName('essencial')).toBe('Starter');
    });
  });

  describe('Stripe Configuration', () => {
    it('should have valid price IDs for all plans', () => {
      const plans: PlanId[] = ['starter', 'pro', 'studio'];
      const currencies = ['eur', 'brl'] as const;
      const intervals = ['monthly', 'yearly'] as const;

      plans.forEach(plan => {
        currencies.forEach(currency => {
          intervals.forEach(interval => {
            const priceId = getPriceId(plan, currency, interval);
            expect(priceId).toBeDefined();
            expect(priceId).toMatch(/^price_/);
          });
        });
      });
    });

    it('should have valid product IDs for all plans', () => {
      const plans: PlanId[] = ['starter', 'pro', 'studio'];
      plans.forEach(plan => {
        const productId = getProductId(plan);
        expect(productId).toBeDefined();
        expect(productId).toMatch(/^prod_/);
      });
    });
  });

  describe('Plan Order', () => {
    it('should have correct plan order', () => {
      expect(PLAN_ORDER).toEqual(['starter', 'pro', 'studio']);
    });
  });

  describe('Feature Consistency Across Plans', () => {
    it('all plans should have kanban enabled', () => {
      const plans: PlanId[] = ['starter', 'pro', 'studio'];
      plans.forEach(planId => {
        const kanban = PLANS[planId].features.find(f => f.key === 'kanban');
        expect(kanban?.included).toBe(true);
      });
    });

    it('all plans should have calendar enabled', () => {
      const plans: PlanId[] = ['starter', 'pro', 'studio'];
      plans.forEach(planId => {
        const calendar = PLANS[planId].features.find(f => f.key === 'calendar');
        expect(calendar?.included).toBe(true);
      });
    });

    it('all plans should have mediaHub enabled', () => {
      const plans: PlanId[] = ['starter', 'pro', 'studio'];
      plans.forEach(planId => {
        const mediaHub = PLANS[planId].features.find(f => f.key === 'mediaHub');
        expect(mediaHub?.included).toBe(true);
      });
    });
  });
});
