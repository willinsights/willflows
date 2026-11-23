import { describe, expect, it } from 'vitest';
import { decideStorageAddonPurchase } from '../../supabase/functions/_shared/stripe-billing.ts';

// Fictitious identities only.
const OWNER = 'user-owner-demo';
const ADMIN = 'user-admin-demo';
const ws = (plan = 'studio', owner: string | null = OWNER) => ({ subscription_plan: plan, owner_id: owner });

describe('F9 — armazenamento adicional só para o dono', () => {
  it('dono de workspace Studio pode comprar', () => {
    expect(decideStorageAddonPurchase({ userId: OWNER, workspace: ws() })).toBeNull();
  });
  it('outro administrador é recusado', () => {
    expect(decideStorageAddonPurchase({ userId: ADMIN, workspace: ws() })).toBe('not_owner');
  });
  it('sem sessão válida é recusado', () => {
    expect(decideStorageAddonPurchase({ userId: null, workspace: ws() })).toBe('unauthenticated');
  });
  it('workspace sem dono: ninguém compra', () => {
    expect(decideStorageAddonPurchase({ userId: OWNER, workspace: ws('studio', null) })).toBe('not_owner');
  });
  it('fora do Studio ou workspace inexistente', () => {
    expect(decideStorageAddonPurchase({ userId: OWNER, workspace: ws('pro') })).toBe('not_studio');
    expect(decideStorageAddonPurchase({ userId: OWNER, workspace: null })).toBe('workspace_not_found');
  });
});
