import { describe, expect, it } from 'vitest';
import { getTeamValueState, getTeamValueUpdates } from '../teamValue';

describe('simplified team values', () => {
  it('Sávio keeps 125 cost and zero payable', () => {
    const original = { cost_amount: 125, payment_amount: 0 };
    expect(getTeamValueState(original).notPaidByMe).toBe(true);
    expect(getTeamValueUpdates(original, 125, true, false, 0)).toEqual({});
    expect(getTeamValueUpdates(original, 130, true, false, 0)).toEqual({ cost_amount: 130 });
  });
  it('Rafaela value updates both cost and payment together', () => {
    expect(getTeamValueUpdates({ cost_amount: 60, payment_amount: 60 }, 70, false, false, 60))
      .toEqual({ cost_amount: 70, payment_amount: 70 });
  });
  it('marking not paid by me preserves the cost fallback', () => {
    expect(getTeamValueUpdates({ cost_amount: null, payment_amount: 60 }, 60, true, false, 60))
      .toEqual({ cost_amount: 60, payment_amount: 0 });
  });
  it('unmarking restores payment without changing cost', () => {
    expect(getTeamValueUpdates({ cost_amount: 125, payment_amount: 0 }, 125, false, false, 0))
      .toEqual({ payment_amount: 125 });
  });
  it('intentional zero and null values stay unchanged', () => {
    expect(getTeamValueState({ cost_amount: null, payment_amount: 0 }).notPaidByMe).toBe(false);
    expect(getTeamValueUpdates({ cost_amount: null, payment_amount: 0 }, 0, false, false, 0)).toEqual({});
  });
  it('preserves existing unequal nonzero values', () => {
    const original = { cost_amount: 125, payment_amount: 60 };
    expect(getTeamValueState(original).separatePayment).toBe(true);
    expect(getTeamValueUpdates(original, 125, false, true, 60)).toEqual({});
    expect(getTeamValueUpdates(original, 130, false, true, 60)).toEqual({ cost_amount: 130 });
  });
});