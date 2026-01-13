import { useEffect, useRef } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { appToast } from '@/hooks/useAppToast';

const TRIAL_WARNING_DAYS = 2;
const TRIAL_WARNING_STORAGE_KEY = 'trial_warning_shown';

export function useTrialWarning() {
  const { subscription, loading } = useUserSubscription();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { createNotification } = useNotifications();
  const hasShownWarningRef = useRef(false);

  useEffect(() => {
    if (loading || !subscription || !user?.id) return;

    // Only show for trialing subscriptions
    if (subscription.status !== 'trialing') return;
    if (!subscription.trialEndsAt) return;

    try {
      const daysRemaining = differenceInDays(
        parseISO(subscription.trialEndsAt),
        new Date()
      );

      // Check if we should show the warning (2 days or less)
      if (daysRemaining > TRIAL_WARNING_DAYS || daysRemaining < 0) return;

      // Check if we already showed the warning today
      const storageKey = `${TRIAL_WARNING_STORAGE_KEY}_${user.id}`;
      const lastWarningDate = localStorage.getItem(storageKey);
      const today = new Date().toDateString();

      if (lastWarningDate === today) return;
      if (hasShownWarningRef.current) return;

      hasShownWarningRef.current = true;

      // Save that we showed the warning today
      localStorage.setItem(storageKey, today);

      // Determine the message based on days remaining
      const title = daysRemaining === 0 
        ? '⚠️ O seu trial termina hoje!'
        : daysRemaining === 1
        ? '⚠️ Falta 1 dia para o trial terminar'
        : `⚠️ Faltam ${daysRemaining} dias para o trial terminar`;

      const message = daysRemaining === 0
        ? 'Faça upgrade agora para continuar a usar o WillFlow sem interrupções.'
        : 'Faça upgrade agora para não perder acesso às suas funcionalidades.';

      // Show toast notification immediately
      appToast.warning(title, {
        description: message,
        duration: 10000, // Show for 10 seconds
      });

      // Also create a persistent notification if workspace is available
      if (currentWorkspace?.id) {
        createNotification(
          user.id,
          'warning',
          title,
          message,
          'subscription',
          'trial_warning'
        );
      }
    } catch (error) {
      console.error('Error checking trial warning:', error);
    }
  }, [loading, subscription, user?.id, currentWorkspace?.id, createNotification]);
}
