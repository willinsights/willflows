import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const st = vi.hoisted(() => ({
  sub: { isPastDueGrace: true, pastDueDaysLeft: 3 as number | null, isOwner: true, isSuperAdmin: false, loading: false },
  account: { status: 'active' as string | null, hasStripeSubscription: true as boolean | undefined },
  openPortal: vi.fn(),
}));
vi.mock('@/hooks/useWorkspaceSubscription', () => ({ useWorkspaceSubscription: () => st.sub }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ subscription: st.account }) }));
vi.mock('@/hooks/usePlanCheckout', () => ({ usePlanCheckout: () => ({ openPortal: st.openPortal, portalLoading: false }) }));

import { PAST_DUE_MEMBER_MESSAGE, PastDueBanner, pastDueGraceMessage } from '../PastDueBanner';
import { MANUAL_PLAN_MESSAGE } from '@/lib/billing/accountPlan';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  st.sub = { isPastDueGrace: true, pastDueDaysLeft: 3, isOwner: true, isSuperAdmin: false, loading: false };
  st.account = { status: 'active', hasStripeSubscription: true };
});

describe('PastDueBanner', () => {
  it('formata singular e plural', () => {
    expect(pastDueGraceMessage(1)).toBe('Pagamento em atraso: faltam 1 dia para o acesso ser limitado.');
    expect(pastDueGraceMessage(3)).toBe('Pagamento em atraso: faltam 3 dias para o acesso ser limitado.');
  });

  it('dono vê os dias e a ação que abre o portal', () => {
    render(<PastDueBanner />);
    expect(screen.getByText(pastDueGraceMessage(3))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Atualizar pagamento/ }));
    expect(st.openPortal).toHaveBeenCalledTimes(1);
  });

  it('outros membros vêem o pedido para contactar o dono, sem ações', () => {
    st.sub.isOwner = false;
    render(<PastDueBanner />);
    expect(screen.getByText(PAST_DUE_MEMBER_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('plano atribuído manualmente não oferece portal', () => {
    st.account = { status: 'active', hasStripeSubscription: false };
    render(<PastDueBanner />);
    expect(screen.getByText(MANUAL_PLAN_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('não aparece fora da tolerância nem para super admin', () => {
    st.sub.isPastDueGrace = false;
    st.sub.pastDueDaysLeft = null;
    const { container } = render(<PastDueBanner />);
    expect(container.innerHTML).toBe('');
    cleanup();
    st.sub = { isPastDueGrace: true, pastDueDaysLeft: 3, isOwner: true, isSuperAdmin: true, loading: false };
    expect(render(<PastDueBanner />).container.innerHTML).toBe('');
  });
});
