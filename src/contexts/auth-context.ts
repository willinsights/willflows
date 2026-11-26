import { createContext, type Context } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, next?: string) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (next?: string) => Promise<{ error: Error | null }>;
  /** Compatibility state; detailed data comes from useUserSubscription. */
  subscription: {
    subscribed: boolean;
    plan: string | null;
    status: string | null;
    subscriptionEnd: string | null;
    trialExpired: boolean;
    trialEndsAt: string | null;
    /** Início do teste gratuito da conta (null se nunca começou ou desconhecido). */
    trialStartedAt?: string | null;
    /** A conta tem subscrição Stripe guardada; `undefined` = desconhecido. */
    hasStripeSubscription?: boolean;
    loading: boolean;
  };
}

// Keep provider/consumer identity stable across preview hot updates, including lazy page imports.
export const AuthContext: Context<AuthContextType | undefined> = import.meta.hot?.data?.authContext ?? createContext<AuthContextType | undefined>(undefined);
if (import.meta.hot?.data) import.meta.hot.data.authContext = AuthContext;