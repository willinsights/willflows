import { describe, expect, it, vi } from 'vitest';
import {
  countOwnedWorkspaces,
  getAccountPlanLabel,
  getCheckoutWorkspaceId,
  getOnboardingOffer,
  getOwnedWorkspaces,
  isManuallyGrantedPlan,
  isWorkspaceOwner,
  getWorkspaceLimitMessage,
  hasActivePaidPlan,
  hasOwnWorkspace,
  waitForPlanConfirmation,
} from '../accountPlan';

describe('hasActivePaidPlan', () => {
  it('só considera pago o estado ativo', () => {
    expect(hasActivePaidPlan('active')).toBe(true);
    for (const status of ['trialing', 'past_due', 'canceled', 'expired', 'unpaid', null, undefined]) {
      expect(hasActivePaidPlan(status)).toBe(false);
    }
  });
});

describe('isWorkspaceOwner', () => {
  it('só o utilizador gravado em owner_id é dono', () => {
    expect(isWorkspaceOwner({ owner_id: 'u-1' }, 'u-1')).toBe(true);
    expect(isWorkspaceOwner({ owner_id: 'u-1' }, 'u-2')).toBe(false);
  });

  it('sem dono registado, sem workspace ou sem utilizador ninguém é dono', () => {
    expect(isWorkspaceOwner({ owner_id: null }, 'u-1')).toBe(false);
    expect(isWorkspaceOwner({}, 'u-1')).toBe(false);
    expect(isWorkspaceOwner({ owner_id: '' }, '')).toBe(false);
    expect(isWorkspaceOwner(null, 'u-1')).toBe(false);
    expect(isWorkspaceOwner({ owner_id: 'u-1' }, null)).toBe(false);
    expect(isWorkspaceOwner({ owner_id: null }, null)).toBe(false);
  });
});

describe('workspaces próprios', () => {
  // Administrador não-dono em w-2 e w-4; dono em w-1 e w-3.
  const workspaces = [
    { id: 'w-1', role: 'admin', owner_id: 'u-1' },
    { id: 'w-2', role: 'admin', owner_id: 'u-2' },
    { id: 'w-3', role: 'admin', owner_id: 'u-1' },
    { id: 'w-4', role: 'admin', owner_id: null },
    { id: 'w-5', role: 'edicao', owner_id: 'u-3' },
  ];

  it('conta os workspaces de que a conta é dona, não os de papel admin', () => {
    expect(countOwnedWorkspaces(workspaces, 'u-1')).toBe(2);
    expect(getOwnedWorkspaces(workspaces, 'u-1').map((w) => w.id)).toEqual(['w-1', 'w-3']);
  });

  it('administrador que não é dono não tem workspaces próprios', () => {
    expect(countOwnedWorkspaces([workspaces[1], workspaces[3]], 'u-1')).toBe(0);
    expect(hasOwnWorkspace([workspaces[1], workspaces[3]], 'u-1')).toBe(false);
  });

  it('hasOwnWorkspace exige pelo menos um workspace de que a conta é dona', () => {
    expect(hasOwnWorkspace([], 'u-1')).toBe(false);
    expect(hasOwnWorkspace(null, 'u-1')).toBe(false);
    expect(hasOwnWorkspace(workspaces, 'u-1')).toBe(true);
    expect(hasOwnWorkspace(workspaces, 'u-9')).toBe(false);
    expect(hasOwnWorkspace(workspaces, null)).toBe(false);
  });
});

describe('getCheckoutWorkspaceId', () => {
  it('só o dono compra para o workspace; os outros compram para a conta', () => {
    expect(getCheckoutWorkspaceId({ id: 'w-1', owner_id: 'u-1' }, 'u-1')).toBe('w-1');
    expect(getCheckoutWorkspaceId({ id: 'w-1', owner_id: 'u-2' }, 'u-1')).toBeUndefined();
    expect(getCheckoutWorkspaceId({ id: 'w-1', owner_id: null }, 'u-1')).toBeUndefined();
    expect(getCheckoutWorkspaceId(null, 'u-1')).toBeUndefined();
  });
});

describe('isManuallyGrantedPlan', () => {
  it('conta ativa sem subscrição Stripe é plano atribuído manualmente', () => {
    expect(isManuallyGrantedPlan({ status: 'active', hasStripeSubscription: false })).toBe(true);
  });

  it('conta ativa com subscrição Stripe não é', () => {
    expect(isManuallyGrantedPlan({ status: 'active', hasStripeSubscription: true })).toBe(false);
  });

  it('desconhecido não conta como manual, nem outros estados', () => {
    expect(isManuallyGrantedPlan({ status: 'active', hasStripeSubscription: undefined })).toBe(false);
    expect(isManuallyGrantedPlan({ status: 'active', hasStripeSubscription: null })).toBe(false);
    for (const status of ['trialing', 'past_due', 'canceled', null, undefined]) {
      expect(isManuallyGrantedPlan({ status, hasStripeSubscription: false })).toBe(false);
    }
  });
});

describe('getOnboardingOffer', () => {
  const now = Date.parse('2026-11-21T12:00:00Z');
  const past = '2026-11-01T00:00:00Z';
  const future = '2026-11-25T00:00:00Z';
  const base = { accountStatus: 'trialing', trialStartedAt: null, trialEndsAt: null, addingToOwnWorkspaces: false };

  it('conta nova: oferta do teste gratuito', () => {
    expect(getOnboardingOffer(base, now)).toBe('trial');
    expect(getOnboardingOffer({ ...base, accountStatus: null }, now)).toBe('trial');
  });

  it('teste começado e terminado, sem plano ativo: teste já usado', () => {
    for (const accountStatus of ['trialing', 'canceled', 'expired', 'past_due', null]) {
      expect(
        getOnboardingOffer({ ...base, accountStatus, trialStartedAt: past, trialEndsAt: past }, now),
      ).toBe('trial_used');
    }
    expect(
      getOnboardingOffer(
        { ...base, trialStartedAt: past, trialEndsAt: past, addingToOwnWorkspaces: true },
        now,
      ),
    ).toBe('trial_used');
  });

  it('plano ativo prevalece sobre o teste já usado', () => {
    expect(
      getOnboardingOffer({ ...base, accountStatus: 'active', trialStartedAt: past, trialEndsAt: past }, now),
    ).toBe('account_plan');
  });

  it('teste em curso: não é teste usado', () => {
    expect(getOnboardingOffer({ ...base, trialStartedAt: past, trialEndsAt: future }, now)).toBe('trial');
    expect(
      getOnboardingOffer(
        { ...base, trialStartedAt: past, trialEndsAt: future, addingToOwnWorkspaces: true },
        now,
      ),
    ).toBe('account_plan');
  });

  it('sem início de teste, ou sem data de fim legível, não afirma que foi usado', () => {
    expect(getOnboardingOffer({ ...base, trialStartedAt: null, trialEndsAt: past }, now)).toBe('trial');
    expect(getOnboardingOffer({ ...base, trialStartedAt: past, trialEndsAt: null }, now)).toBe('trial');
    expect(getOnboardingOffer({ ...base, trialStartedAt: past, trialEndsAt: 'x' }, now)).toBe('trial');
  });

  it('conta que já é dona de um workspace usa o plano da conta', () => {
    expect(getOnboardingOffer({ ...base, addingToOwnWorkspaces: true }, now)).toBe('account_plan');
  });
});

describe('getAccountPlanLabel', () => {
  it('devolve o nome do plano ou null', () => {
    expect(getAccountPlanLabel('studio')).toBe('Studio');
    expect(getAccountPlanLabel('desconhecido')).toBeNull();
    expect(getAccountPlanLabel(null)).toBeNull();
  });
});

describe('getWorkspaceLimitMessage', () => {
  it('pede um plano ativo a quem não tem plano pago', () => {
    expect(getWorkspaceLimitMessage('trialing')).toBe('Para criar mais workspaces é preciso um plano ativo.');
    expect(getWorkspaceLimitMessage(null)).toBe('Para criar mais workspaces é preciso um plano ativo.');
  });

  it('sugere um plano superior a quem já paga', () => {
    expect(getWorkspaceLimitMessage('active')).toContain('plano superior');
  });
});

describe('waitForPlanConfirmation', () => {
  const sleep = vi.fn(async () => {});

  it('confirma assim que a leitura devolve verdadeiro', async () => {
    const check = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(waitForPlanConfirmation({ check, attempts: 5, sleep })).resolves.toBe(true);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('desiste ao fim das tentativas, sem esperar depois da última', async () => {
    sleep.mockClear();
    const check = vi.fn().mockResolvedValue(false);
    await expect(waitForPlanConfirmation({ check, attempts: 3, intervalMs: 10, sleep })).resolves.toBe(false);
    expect(check).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('uma leitura falhada conta como ainda não confirmado', async () => {
    const check = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(true);
    await expect(waitForPlanConfirmation({ check, attempts: 3, sleep })).resolves.toBe(true);
  });

  it('pára quando é cancelado', async () => {
    const check = vi.fn().mockResolvedValue(true);
    await expect(waitForPlanConfirmation({ check, sleep, isCancelled: () => true })).resolves.toBe(false);
    expect(check).not.toHaveBeenCalled();
  });
});
