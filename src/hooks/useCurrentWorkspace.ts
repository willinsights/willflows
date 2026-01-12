import { useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

interface CurrentWorkspaceData {
  // Core workspace info
  workspaceId: string | null;
  workspaceName: string;
  workspaceSlug: string;
  
  // Regional settings
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  country: 'PT' | 'BR' | null;
  
  // Subscription info
  subscriptionPlan: 'essencial' | 'pro' | 'studio';
  subscriptionStatus: SubscriptionStatus;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  trialDaysLeft: number;
  isTrialExpired: boolean;
  hasActiveSubscription: boolean;
  
  // Permissions
  userRole: 'admin' | 'editor' | 'captacao' | 'freelancer' | 'visualizador' | null;
  isAdmin: boolean;
  isEditor: boolean;
  canEdit: boolean;
  canManageTeam: boolean;
  canManagePayments: boolean;
  canViewReports: boolean;
  
  // State
  isLoading: boolean;
  hasError: boolean;
  hasWorkspace: boolean;
  
  // Utilities
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  
  // Actions
  refresh: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  BRL: 'R$',
  USD: '$',
};

export function useCurrentWorkspace(): CurrentWorkspaceData {
  const {
    workspace,
    membership,
    loading,
    fetchError,
    refreshWorkspace,
    setCurrentWorkspace,
    isAdmin,
    canEdit,
  } = useWorkspace();

  return useMemo(() => {
    const currency = workspace?.currency || 'EUR';
    const locale = workspace?.locale || 'pt-PT';
    const timezone = workspace?.timezone || 'Europe/Lisbon';
    const subscriptionStatus = (workspace?.subscription_status || 'trialing') as SubscriptionStatus;
    const trialEndsAt = workspace?.trial_ends_at ? new Date(workspace.trial_ends_at) : null;
    
    // Calculate trial days
    const now = new Date();
    const trialDaysLeft = trialEndsAt 
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const isTrialExpired = trialEndsAt ? trialEndsAt < now : false;
    
    // Permission helpers
    const userRole = membership?.role || null;
    const isEditor = userRole === 'editor';
    const canManageTeam = ['admin', 'editor'].includes(userRole || '');
    const canManagePayments = ['admin', 'editor'].includes(userRole || '');
    const canViewReports = ['admin', 'editor', 'visualizador'].includes(userRole || '');

    // Currency formatter
    const formatCurrency = (amount: number): string => {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        // Fallback formatting
        const symbol = CURRENCY_SYMBOLS[currency] || currency;
        return `${symbol} ${amount.toFixed(2)}`;
      }
    };

    // Date formatter
    const formatDate = (date: Date | string): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: timezone,
        }).format(d);
      } catch {
        return String(date);
      }
    };

    // DateTime formatter
    const formatDateTime = (date: Date | string): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: timezone,
        }).format(d);
      } catch {
        return String(date);
      }
    };

    return {
      // Core workspace info
      workspaceId: workspace?.id || null,
      workspaceName: workspace?.name || '',
      workspaceSlug: workspace?.slug || '',
      
      // Regional settings
      currency,
      currencySymbol: CURRENCY_SYMBOLS[currency] || currency,
      locale,
      timezone,
      country: workspace?.country || null,
      
      // Subscription info
      subscriptionPlan: workspace?.subscription_plan || 'essencial',
      subscriptionStatus,
      isTrialing: subscriptionStatus === 'trialing',
      trialEndsAt,
      trialDaysLeft,
      isTrialExpired,
      hasActiveSubscription: ['active', 'trialing'].includes(subscriptionStatus) && !isTrialExpired,
      
      // Permissions
      userRole,
      isAdmin,
      isEditor,
      canEdit,
      canManageTeam,
      canManagePayments,
      canViewReports,
      
      // State
      isLoading: loading,
      hasError: fetchError,
      hasWorkspace: !!workspace,
      
      // Utilities
      formatCurrency,
      formatDate,
      formatDateTime,
      
      // Actions
      refresh: refreshWorkspace,
      switchWorkspace: setCurrentWorkspace,
    };
  }, [workspace, membership, loading, fetchError, refreshWorkspace, setCurrentWorkspace, isAdmin, canEdit]);
}
