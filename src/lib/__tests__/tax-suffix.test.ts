import { describe, it, expect } from 'vitest';
import { getTaxSuffix, PRICES_TAX_NOTE, PLANS } from '../plans';

describe('getTaxSuffix', () => {
  it('mostra «+ IVA» para euros, com qualquer capitalização', () => {
    expect(getTaxSuffix('eur')).toBe('+ IVA');
    expect(getTaxSuffix('EUR')).toBe('+ IVA');
  });

  it('mostra «+ impostos» para reais', () => {
    expect(getTaxSuffix('brl')).toBe('+ impostos');
    expect(getTaxSuffix('BRL')).toBe('+ impostos');
  });

  it('mostra «+ impostos» por omissão', () => {
    expect(getTaxSuffix('usd')).toBe('+ impostos');
    expect(getTaxSuffix(undefined)).toBe('+ impostos');
    expect(getTaxSuffix(null)).toBe('+ impostos');
    expect(getTaxSuffix('')).toBe('+ impostos');
  });

  it('não altera os valores dos planos', () => {
    expect(PLANS.starter.prices.eur.monthly).toBe(14);
    expect(PLANS.pro.prices.eur.monthly).toBe(24);
    expect(PLANS.studio.prices.eur.monthly).toBe(42);
  });

  it('tem a nota de rodapé de impostos', () => {
    expect(PRICES_TAX_NOTE).toBe(
      'Preços sem impostos. O IVA ou outros impostos aplicáveis são calculados no pagamento, conforme o país.',
    );
  });
});
