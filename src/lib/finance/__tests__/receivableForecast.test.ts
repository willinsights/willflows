import { describe, expect, it } from 'vitest';
import { getReceivableForecastDate } from '../receivableForecast';

describe('getReceivableForecastDate', () => {
  it('uses the agreed date before the delivery-based forecast', () => {
    expect(getReceivableForecastDate({
      client_payment_due_date: '2026-12-15',
      delivered_at: '2026-11-27T10:00:00Z',
    })).toBe('2026-12-15');
  });

  it('adds eight calendar days across a month boundary', () => {
    expect(getReceivableForecastDate({
      client_payment_due_date: null,
      delivered_at: '2026-11-27T10:00:00Z',
    })).toBe('2026-12-05');
  });

  it.each([null, 'invalid'])('has no forecast without a valid delivery (%s)', (deliveredAt) => {
    expect(getReceivableForecastDate({
      client_payment_due_date: null,
      delivered_at: deliveredAt,
    })).toBeNull();
  });
});
