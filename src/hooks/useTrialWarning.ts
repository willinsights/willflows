import { useEffect, useRef } from 'react';
import { useWorkspaceSubscription } from '@/hooks/useWorkspaceSubscription';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { appToast } from '@/hooks/useAppToast';

const TRIAL_WARNING_DAYS = 2;
const TRIAL_WARNING_STORAGE_KEY = 'trial_warning_shown';

export function useTrialWarning() {
  const { 
    isTrial, 
    trialDaysRemaining, 
    shouldShowTrialUI, 
    loading, 
    workspaceId 
  } = useWorkspaceSubscription();
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const hasShownWarningRef = useRef(false);

  useEffect(() => {
    if (loading || !user?.id) return;

    // Only show for workspace owners during trial
    if (!shouldShowTrialUI) return;
    if (!isTrial) return;
    if (trialDaysRemaining === null) return;

    // Check if we should show the warning (2 days or less)
    if (trialDaysRemaining > TRIAL_WARNING_DAYS || trialDaysRemaining < 0) return;

    // Check if we already showed the warning today
    const storageKey = `${TRIAL_WARNING_STORAGE_KEY}_${workspaceId}`;
    const lastWarningDate = localStorage.getItem(storageKey);
    const today = new Date().toDateString();

    if (lastWarningDate === today) return;
    if (hasShownWarningRef.current) return;

    hasShownWarningRef.current = true;

    // Save that we showed the warning today
    localStorage.setItem(storageKey, today);

    // Determine the message based on days remaining
    const title = trialDaysRemaining === 0 
      ? '⚠️ O seu trial termina hoje!'
      : trialDaysRemaining === 1
      ? '⚠️ Falta 1 dia para o trial terminar'
      : `⚠️ Faltam ${trialDaysRemaining} dias para o trial terminar`;

    const message = trialDaysRemaining === 0
      ? 'Faça upgrade agora para continuar a usar o WillFlow sem interrupções.'
      : 'Faça upgrade agora para não perder acesso às suas funcionalidades.';

    // Show toast notification immediately
    appToast.warning(title, {
      description: message,
      duration: 10000, // Show for 10 seconds
    });

    // Also create a persistent notification if workspace is available
    if (workspaceId) {
      createNotification(
        user.id,
        'warning',
        title,
        message,
        'subscription',
        'trial_warning'
      );
    }
  }, [loading, isTrial, trialDaysRemaining, shouldShowTrialUI, user?.id, workspaceId, createNotification]);
}
