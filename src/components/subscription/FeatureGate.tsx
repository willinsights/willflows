import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UpgradeAlert } from './UpgradeAlert';
import { usePlanFeatures, type FeatureKey } from '@/hooks/usePlanFeatures';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface FeatureGateProps {
  /** The feature key to check access for */
  feature: FeatureKey;
  /** Children to render if feature is available */
  children: ReactNode;
  /** 
   * Fallback content when feature is not available.
   * If not provided, shows a locked button.
   */
  fallback?: ReactNode;
  /**
   * How to handle unavailable features:
   * - 'hide': Don't render anything
   * - 'disable': Render children but disabled (wraps in a disabled container)
   * - 'lock': Show a locked button that triggers upgrade modal
   * - 'custom': Use the fallback prop
   * @default 'lock'
   */
  mode?: 'hide' | 'disable' | 'lock' | 'custom';
  /** Label to show on the lock button (defaults to feature name) */
  lockLabel?: string;
  /** Additional class name for the wrapper */
  className?: string;
}

/**
 * FeatureGate component - wraps premium features and handles access control
 * 
 * Usage:
 * ```tsx
 * <FeatureGate feature="exportPdf">
 *   <Button onClick={handleExportPdf}>Export PDF</Button>
 * </FeatureGate>
 * ```
 * 
 * With custom fallback:
 * ```tsx
 * <FeatureGate feature="googleCalendar" mode="custom" fallback={<UpgradeCard />}>
 *   <GoogleCalendarIntegration />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  mode = 'lock',
  lockLabel,
  className,
}: FeatureGateProps) {
  const { isSuperAdmin } = useSuperAdmin();
  const { 
    canUseFeature, 
    checkFeature, 
    getFeatureInfo,
    currentPlan,
    upgradeAlert, 
    closeUpgradeAlert 
  } = usePlanFeatures();

  // Super Admin has direct access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const hasAccess = canUseFeature(feature);
  const featureInfo = getFeatureInfo(feature);

  // If user has access, render children normally
  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle different modes for unavailable features
  switch (mode) {
    case 'hide':
      return null;

    case 'disable':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`opacity-50 pointer-events-none ${className || ''}`}>
                {children}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Disponível no plano {featureInfo?.minimumPlan === 'essencial' ? 'Starter' : featureInfo?.minimumPlan}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

    case 'custom':
      return <>{fallback}</>;

    case 'lock':
    default:
      return (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={`gap-2 ${className || ''}`}
                  onClick={() => checkFeature(feature)}
                >
                  <Lock className="h-4 w-4" />
                  {lockLabel || featureInfo?.name || 'Premium'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Requer plano {featureInfo?.minimumPlan === 'essencial' ? 'Starter' : featureInfo?.minimumPlan === 'pro' ? 'Pro' : 'Studio'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <UpgradeAlert
            isOpen={upgradeAlert.isOpen}
            onClose={closeUpgradeAlert}
            feature={upgradeAlert.feature}
            requiredPlan={upgradeAlert.requiredPlan}
            currentPlan={currentPlan}
            isLimitReached={upgradeAlert.isLimitReached}
          />
        </>
      );
  }
}

/**
 * Hook version for more complex scenarios
 * Returns a wrapper function and the upgrade alert component
 */
export function useFeatureGate(feature: FeatureKey) {
  const {
    canUseFeature,
    checkFeature,
    getFeatureInfo,
    currentPlan,
    upgradeAlert,
    closeUpgradeAlert,
  } = usePlanFeatures();

  const hasAccess = canUseFeature(feature);
  const featureInfo = getFeatureInfo(feature);

  const requireFeature = (callback: () => void) => {
    if (checkFeature(feature)) {
      callback();
    }
  };

  const UpgradeAlertComponent = () => (
    <UpgradeAlert
      isOpen={upgradeAlert.isOpen}
      onClose={closeUpgradeAlert}
      feature={upgradeAlert.feature}
      requiredPlan={upgradeAlert.requiredPlan}
      currentPlan={currentPlan}
      isLimitReached={upgradeAlert.isLimitReached}
    />
  );

  return {
    hasAccess,
    featureInfo,
    requireFeature,
    UpgradeAlertComponent,
  };
}
