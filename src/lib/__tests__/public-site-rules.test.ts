import { describe, expect, it } from 'vitest';
import { getDisplayPrice, getDisplayPlans, getYearlyTotal, PLANS, PLAN_LIMITS } from '../plans';
import { isBlogAutoGenerateEnabled } from '../../../supabase/functions/_shared/blog-auto-generate-enabled';

describe('Public plan rules', () => {
  it('Studio matches the server base quota of 10 GB', () => {
    expect(PLAN_LIMITS.studio.storage).toBe(10);
  });
  it('Starter has no Excel export', () => {
    expect(PLANS.starter.features.find(feature => feature.key === 'exportExcel')?.included).toBe(false);
  });
  it('Studio annual billing remains 403 EUR', () => {
    expect(getYearlyTotal('studio', 'eur')).toBe(403);
    expect(getDisplayPrice('studio', 'eur', 'yearly')).toBe(33.58);
    expect(getDisplayPlans('eur').find(plan => plan.id === 'studio')?.priceAnnualTotal).toBe(403);
  });
});

describe('Automatic blog generation', () => {
  it.each([undefined, '', 'false', 'TRUE', '1', ' true '])('is disabled for %s', value => {
    expect(isBlogAutoGenerateEnabled(value)).toBe(false);
  });
  it('only enables for exactly true', () => {
    expect(isBlogAutoGenerateEnabled('true')).toBe(true);
  });
});