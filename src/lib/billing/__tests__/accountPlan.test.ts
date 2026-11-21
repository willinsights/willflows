import { describe, expect, it, vi } from 'vitest';
import {
  getAccountPlanLabel,
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

describe('hasOwnWorkspace', () => {
  it('exige pelo menos um workspace em que a conta é administradora', () => {
    expect(hasOwnWorkspace([])).toBe(false);
    expect(hasOwnWorkspace([{ role: 'edicao' }, { role: 'visualizacao' }])).toBe(false);
    expect(hasOwnWorkspace([{ role: 'edicao' }, { role: 'admin' }])).toBe(true);
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
