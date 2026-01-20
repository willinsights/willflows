import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';
import { useAdminAudit } from './useAdminAudit';
import { useToast } from './use-toast';
import { PLANS, PLAN_DB_MAPPING, type PlanId } from '@/lib/plans';

export interface BillingResetPreview {
  subscriptionsToReset: number;
  protectedSubscriptions: number;
  invoicesToDelete: number;
  webhookLogsToDelete: number;
  protectedEmails: string[];
}

export interface BillingResetResult {
  subscriptionsReset: number;
  invoicesDeleted: number;
  webhookLogsDeleted: number;
  success: boolean;
}
export interface Subscription {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  subscription_plan: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  mrr: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  user_email?: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  amount_total: number;
  amount_subtotal: number;
  amount_tax: number | null;
  currency: string;
  status: string;
  billing_reason: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface WebhookLog {
  id: string;
  event_type: string;
  event_id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

// Use official prices from plans.ts
const getPlanPrice = (plan: string): number => {
  const planId: PlanId = PLAN_DB_MAPPING[plan] || 'starter';
  return PLANS[planId]?.prices.eur.monthly || 0;
};

export function useAdminBilling() {
  const { isSuperAdmin } = useSuperAdmin();
  const { logAction } = useAdminAudit();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Subscriptions (excluding Super Admins from MRR calculations)
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async (): Promise<(Subscription & { isSuperAdmin?: boolean })[]> => {
      // Fetch super admins to exclude from MRR
      const { data: systemAdmins } = await supabase
        .from('system_admins')
        .select('user_id');
      const adminIds = new Set((systemAdmins || []).map(a => a.user_id));

      const { data: subs, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!subs) return [];

      const userIds = subs.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return subs.map(s => {
        const isSuperAdmin = adminIds.has(s.user_id);
        return {
          id: s.id,
          user_id: s.user_id,
          user_email: profileMap.get(s.user_id)?.email || 'N/A',
          user_name: profileMap.get(s.user_id)?.full_name || null,
          subscription_plan: s.subscription_plan,
          subscription_status: s.subscription_status,
          stripe_customer_id: s.stripe_customer_id,
          stripe_subscription_id: s.stripe_subscription_id,
          trial_ends_at: s.trial_ends_at,
          current_period_end: s.current_period_end,
          cancel_at_period_end: false, // Field not yet in schema
          mrr: isSuperAdmin ? 0 : getPlanPrice(s.subscription_plan), // Super Admins don't pay
          isSuperAdmin,
        };
      });
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!data) return [];

      const userIds = [...new Set(data.map(i => i.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));

      return data.map(i => ({
        ...i,
        user_email: profileMap.get(i.user_id) || 'N/A',
      }));
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Past due subscriptions (dunning)
  const { data: dunningSubscriptions = [], isLoading: dunningLoading } = useQuery({
    queryKey: ['admin-dunning'],
    queryFn: async (): Promise<Subscription[]> => {
      const { data: subs, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('subscription_status', 'past_due')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!subs) return [];

      const userIds = subs.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return subs.map(s => ({
        id: s.id,
        user_id: s.user_id,
        user_email: profileMap.get(s.user_id)?.email || 'N/A',
        user_name: profileMap.get(s.user_id)?.full_name || null,
        subscription_plan: s.subscription_plan,
        subscription_status: s.subscription_status,
        stripe_customer_id: s.stripe_customer_id,
        stripe_subscription_id: s.stripe_subscription_id,
        trial_ends_at: s.trial_ends_at,
        current_period_end: s.current_period_end,
        cancel_at_period_end: false, // Field not yet in schema
        mrr: getPlanPrice(s.subscription_plan),
      }));
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 2,
  });

  // Webhook logs
  const { data: webhookLogs = [], isLoading: webhooksLoading } = useQuery({
    queryKey: ['admin-webhook-logs'],
    queryFn: async (): Promise<WebhookLog[]> => {
      const { data, error } = await supabase
        .from('stripe_webhook_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 2,
  });

  // Cancel subscription
  const cancelSubscription = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          subscription_status: 'canceled',
          cancel_at_period_end: true,
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await logAction({
        action: 'cancel_subscription',
        targetType: 'subscription',
        targetId: subscriptionId,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Subscrição cancelada',
        description: 'A subscrição foi cancelada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dunning'] });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a subscrição.',
        variant: 'destructive',
      });
    },
  });

  // Billing stats
  const billingStats = {
    totalMRR: subscriptions
      .filter(s => s.subscription_status === 'active')
      .reduce((sum, s) => sum + s.mrr, 0),
    activeCount: subscriptions.filter(s => s.subscription_status === 'active').length,
    trialingCount: subscriptions.filter(s => s.subscription_status === 'trialing').length,
    pastDueCount: subscriptions.filter(s => s.subscription_status === 'past_due').length,
    canceledCount: subscriptions.filter(s => s.subscription_status === 'canceled').length,
  };

  // Reset billing preview
  const [resetPreview, setResetPreview] = useState<BillingResetPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const fetchResetPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-billing-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: 'preview' }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch preview');
      
      setResetPreview(result.preview);
      return result.preview;
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a pré-visualização.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Execute reset
  const executeReset = useMutation({
    mutationFn: async (): Promise<BillingResetResult> => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-billing-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: 'execute' }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to execute reset');
      
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: 'Reset concluído',
        description: `${result.subscriptionsReset} subscrições resetadas, ${result.invoicesDeleted} invoices apagadas.`,
      });
      setResetPreview(null);
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-webhook-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dunning'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível executar o reset.',
        variant: 'destructive',
      });
    },
  });

  return {
    subscriptions,
    invoices,
    dunningSubscriptions,
    webhookLogs,
    billingStats,
    isLoading: subscriptionsLoading || invoicesLoading || dunningLoading || webhooksLoading,
    cancelSubscription: cancelSubscription.mutate,
    isCanceling: cancelSubscription.isPending,
    // Reset billing
    resetPreview,
    isLoadingPreview,
    fetchResetPreview,
    executeReset: executeReset.mutate,
    isResetting: executeReset.isPending,
  };
}
