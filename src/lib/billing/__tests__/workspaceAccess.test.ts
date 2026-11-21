import { describe, expect, it } from 'vitest';
import { PAST_DUE_GRACE_DAYS, getWorkspaceAccessState } from '../workspaceAccess';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-21T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

describe('getWorkspaceAccessState', () => {
  it('ativo é sempre ativo', () => {
    expect(getWorkspaceAccessState({ status: 'active', trialEndsAt: null, pastDueSince: null, now: NOW }))
      .toEqual({ active: true, reason: 'active' });
  });

  it('tolerância de pagamento em atraso é de 7 dias', () => {
    expect(PAST_DUE_GRACE_DAYS).toBe(7);
  });

  it('pagamento em atraso há pouco tempo continua ativo e conta os dias', () => {
    const state = getWorkspaceAccessState({
      status: 'past_due', trialEndsAt: null, pastDueSince: iso(NOW - 2 * DAY), now: NOW,
    });
    expect(state.active).toBe(true);
    expect(state.reason).toBe('past_due_grace');
    expect(state.daysLeft).toBe(5);
    expect(state.graceEndsAt?.toISOString()).toBe(iso(NOW + 5 * DAY));
  });

  it('arredonda os dias que faltam para cima', () => {
    const state = getWorkspaceAccessState({
      status: 'past_due', trialEndsAt: null, pastDueSince: iso(NOW - 6 * DAY - 1000), now: NOW,
    });
    expect(state).toMatchObject({ active: true, reason: 'past_due_grace', daysLeft: 1 });
  });

  it('fronteira: exatamente 7 dias depois já não é ativo (como o servidor: since > now - 7 dias)', () => {
    const since = iso(NOW - 7 * DAY);
    expect(getWorkspaceAccessState({ status: 'past_due', trialEndsAt: null, pastDueSince: since, now: NOW }))
      .toMatchObject({ active: false, reason: 'past_due_expired', daysLeft: 0 });
    expect(getWorkspaceAccessState({ status: 'past_due', trialEndsAt: null, pastDueSince: since, now: NOW - 1 }))
      .toMatchObject({ active: true, reason: 'past_due_grace', daysLeft: 1 });
  });

  it('pagamento em atraso sem data conta como «agora» (7 dias inteiros)', () => {
    const state = getWorkspaceAccessState({ status: 'past_due', trialEndsAt: null, pastDueSince: null, now: NOW });
    expect(state).toMatchObject({ active: true, reason: 'past_due_grace', daysLeft: 7 });
    expect(state.graceEndsAt?.getTime()).toBe(NOW + 7 * DAY);
  });

  it('teste com data no futuro é ativo; na data exata expira', () => {
    expect(getWorkspaceAccessState({ status: 'trialing', trialEndsAt: iso(NOW + DAY + 1), pastDueSince: null, now: NOW }))
      .toEqual({ active: true, reason: 'trial', daysLeft: 2 });
    expect(getWorkspaceAccessState({ status: 'trialing', trialEndsAt: iso(NOW), pastDueSince: null, now: NOW }))
      .toMatchObject({ active: false, reason: 'trial_expired' });
  });

  it('teste sem data de fim não é ativo', () => {
    for (const trialEndsAt of [null, undefined, '', 'não é data']) {
      expect(getWorkspaceAccessState({ status: 'trialing', trialEndsAt, pastDueSince: null, now: NOW }))
        .toEqual({ active: false, reason: 'trial_no_end' });
    }
  });

  it('cancelado e outros estados não são ativos', () => {
    expect(getWorkspaceAccessState({ status: 'canceled', trialEndsAt: iso(NOW + DAY), pastDueSince: null, now: NOW }))
      .toEqual({ active: false, reason: 'canceled' });
    for (const status of ['unpaid', 'expired', 'incomplete', null, undefined]) {
      expect(getWorkspaceAccessState({ status, trialEndsAt: iso(NOW + DAY), pastDueSince: null, now: NOW }))
        .toEqual({ active: false, reason: 'other' });
    }
  });
});
