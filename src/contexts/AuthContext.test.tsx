import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextType } from './auth-context';
import { AuthContext } from './auth-context';
import { useAuth } from './AuthContext';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/integrations/lovable', () => ({ lovable: {} }));
vi.mock('@/hooks/useUserSubscription', () => ({ useUserSubscription: vi.fn() }));
const value: AuthContextType = {
  user: null, session: null, loading: false,
  signIn: async () => ({ error: null }), signUp: async () => ({ error: null }),
  signOut: async () => {}, resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }), signInWithGoogle: async () => ({ error: null }),
  subscription: { subscribed: false, plan: null, status: null, subscriptionEnd: null, trialExpired: false, trialEndsAt: null, loading: false },
};
afterEach(cleanup);
describe('shared authentication context', () => {
  it('reads the retained provider through the exported authentication hook', () => {
    function Consumer() { const auth = useAuth(); return <output>{auth.loading ? 'pending' : 'ready'}</output>; }
    render(<AuthContext.Provider value={value}><Consumer /></AuthContext.Provider>);
    expect(screen.getByText('ready')).toBeTruthy();
  });
  it('does not invent signed-in state when the provider is absent', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Consumer() { useAuth(); return null; }
    try { expect(() => render(<Consumer />)).toThrow('useAuth must be used within an AuthProvider'); }
    finally { consoleError.mockRestore(); }
  });
});