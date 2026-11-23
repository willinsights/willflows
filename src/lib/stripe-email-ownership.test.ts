import { describe, expect, it } from 'vitest';
import { isEmailSubscriptionOwnedByUser, pickEmailCustomerForUser } from '../../supabase/functions/_shared/stripe-billing.ts';

// Fictitious identities only.
const ME = 'user-demo-a';
const OTHER = 'user-demo-b';
const sub = (owner?: string) => ({ id: 'sub_demo', metadata: owner ? { user_id: owner } : {} });

describe('F8 — cliente encontrado por email pertence à conta', () => {
  it('cliente marcado com esta conta: associa', () => {
    expect(isEmailSubscriptionOwnedByUser({ id: 'cus_1', metadata: { user_id: ME } }, sub(), ME)).toBe(true);
  });
  it('cliente sem dono, subscrição com esta conta: associa', () => {
    expect(isEmailSubscriptionOwnedByUser({ id: 'cus_1', metadata: {} }, sub(ME), ME)).toBe(true);
  });
  it('cliente sem dono e subscrição sem dono: não associa (o email não prova)', () => {
    expect(isEmailSubscriptionOwnedByUser({ id: 'cus_1', metadata: {} }, sub(), ME)).toBe(false);
  });
  it('cliente de outra conta com o mesmo email: nunca associa', () => {
    expect(isEmailSubscriptionOwnedByUser({ id: 'cus_2', metadata: { user_id: OTHER } }, sub(ME), ME)).toBe(false);
    expect(pickEmailCustomerForUser([{ id: 'cus_2', metadata: { user_id: OTHER } }], ME)).toBeNull();
  });
  it('cliente apagado ou subscrição em falta: não associa', () => {
    expect(isEmailSubscriptionOwnedByUser({ id: 'cus_1', deleted: true, metadata: { user_id: ME } }, sub(ME), ME)).toBe(false);
    expect(isEmailSubscriptionOwnedByUser({ id: 'cus_1', metadata: { user_id: ME } }, null, ME)).toBe(false);
  });
  it('escolhe o cliente desta conta entre vários com o mesmo email', () => {
    expect(pickEmailCustomerForUser([
      { id: 'cus_other', metadata: { user_id: OTHER } },
      { id: 'cus_free', metadata: {} },
      { id: 'cus_mine', metadata: { user_id: ME } },
    ], ME)).toBe('cus_mine');
  });
});
