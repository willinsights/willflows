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
import plansSource from '../plans.ts?raw';
import createCheckoutSource from '../../../supabase/functions/create-checkout/index.ts?raw';

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
        storage: 10,
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
      expect(videoApproval?.included).toBe(false);
    });

    it('Studio: videoApproval should be TRUE (included)', () => {
      const studioFeatures = PLANS.studio.features;
      const videoApproval = studioFeatures.find(f => f.key === 'videoApproval');
      expect(videoApproval?.included).toBe(true);
    });

    it('Studio: automations should be TRUE (included)', () => {
      const automation = PLANS.studio.features.find(f => f.key === 'automations');
      expect(automation?.included).toBe(true);
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

  describe('Studio a €42 (F12)', () => {
    const NEW_STUDIO_PRICES = {
      eur: { monthly: 'price_1UeHdFGr2lXbVyw9FROVLOgH', yearly: 'price_1UeHdxGr2lXbVyw9QWswuXXG' },
      brl: { monthly: 'price_1UeHebGr2lXbVyw9ukkckd8y', yearly: 'price_1UeHfLGr2lXbVyw9jrB6CDfn' },
    };
    // Antigos preços do Studio a €32: não podem voltar a aparecer
    const OLD_STUDIO_PRICE_IDS = [
      'price_1SrikfGr2lXbVyw9fXBV7BGs',
      'price_1SrikfGr2lXbVyw9KpGstQ2S',
      'price_1SrikgGr2lXbVyw9Rt6xW57v',
      'price_1SrikhGr2lXbVyw9JnFXF1E2',
    ];

    it('usa os 4 novos identificadores de preço do Studio', () => {
      expect(STRIPE_PRICES.studio.eur).toEqual(NEW_STUDIO_PRICES.eur);
      expect(STRIPE_PRICES.studio.brl).toEqual(NEW_STUDIO_PRICES.brl);
      expect(getPriceId('studio', 'eur', 'monthly')).toBe(NEW_STUDIO_PRICES.eur.monthly);
      expect(getPriceId('studio', 'eur', 'yearly')).toBe(NEW_STUDIO_PRICES.eur.yearly);
      expect(getPriceId('studio', 'brl', 'monthly')).toBe(NEW_STUDIO_PRICES.brl.monthly);
      expect(getPriceId('studio', 'brl', 'yearly')).toBe(NEW_STUDIO_PRICES.brl.yearly);
    });

    it('mantém o produto Studio e os valores exibidos 42/403/247/2371', () => {
      expect(getProductId('studio')).toBe('prod_TpNVM1mlDtAvKA');
      expect(PLANS.studio.prices).toEqual({
        eur: { monthly: 42, yearly: 403 },
        brl: { monthly: 247, yearly: 2371 },
      });
    });

    it('nenhum identificador antigo do Studio aparece em plans.ts', () => {
      OLD_STUDIO_PRICE_IDS.forEach((id) => {
        expect(plansSource).not.toContain(id);
      });
    });

    it('create-checkout aceita exatamente os preços de plans.ts', () => {
      const allowed = new Set(createCheckoutSource.match(/'price_[A-Za-z0-9]+'/g)?.map((m) => m.slice(1, -1)));
      const fromPlans = new Set<string>();
      (['starter', 'pro', 'studio'] as const).forEach((plan) => {
        (['eur', 'brl'] as const).forEach((currency) => {
          (['monthly', 'yearly'] as const).forEach((interval) => {
            fromPlans.add(getPriceId(plan, currency, interval));
          });
        });
      });
      expect([...allowed].sort()).toEqual([...fromPlans].sort());
      OLD_STUDIO_PRICE_IDS.forEach((id) => expect(allowed.has(id)).toBe(false));
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
