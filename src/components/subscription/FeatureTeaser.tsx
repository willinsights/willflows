import { ReactNode } from 'react';
import { Lock, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { usePlanFeatures, type FeatureKey } from '@/hooks/usePlanFeatures';
import { UpgradeAlert } from './UpgradeAlert';

interface FeatureTeaserProps {
  feature: FeatureKey;
  title?: string;
  description?: string;
  previewImage?: string;
  children?: ReactNode;
  className?: string;
  /** Whether to show a blurred preview of children */
  showBlurredPreview?: boolean;
  /** Custom CTA label */
  ctaLabel?: string;
}

const planLabels = {
  starter: 'Starter',
  pro: 'Pro',
  studio: 'Studio',
};

/**
 * FeatureTeaser - Shows a premium feature preview with blur/lock overlay
 * 
 * Modes:
 * 1. With children + showBlurredPreview: Shows children with blur overlay
 * 2. With previewImage: Shows image with blur overlay
 * 3. Default: Shows an elegant card with feature info
 */
export function FeatureTeaser({
  feature,
  title,
  description,
  previewImage,
  children,
  className,
  showBlurredPreview = true,
  ctaLabel,
}: FeatureTeaserProps) {
  const navigate = useNavigate();
  const { 
    getFeatureInfo, 
    getRequiredPlan, 
    currentPlan,
    checkFeature,
    upgradeAlert,
    closeUpgradeAlert,
  } = usePlanFeatures();
  
  const featureInfo = getFeatureInfo(feature);
  const requiredPlan = getRequiredPlan(feature);
  const displayTitle = title || featureInfo?.name || 'Funcionalidade Premium';
  const displayDescription = description || featureInfo?.description || 'Faça upgrade para desbloquear esta funcionalidade.';
  
  // If has children with blur preview
  if (children && showBlurredPreview) {
    return (
      <div className={cn('relative', className)}>
        {/* Blurred content */}
        <div className="filter blur-[6px] pointer-events-none select-none opacity-60">
          {children}
        </div>
        
        {/* Overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="text-center max-w-md px-6">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
            >
              <Lock className="h-7 w-7 text-primary" />
            </motion.div>
            
            <Badge variant="secondary" className="mb-3">
              {planLabels[requiredPlan]} ou superior
            </Badge>
            
            <h3 className="text-xl font-semibold mb-2">{displayTitle}</h3>
            <p className="text-muted-foreground mb-6">{displayDescription}</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => checkFeature(feature)} className="gap-2">
                <Zap className="h-4 w-4" />
                {ctaLabel || 'Desbloquear'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/app/planos')}>
                Ver planos
              </Button>
            </div>
          </div>
        </motion.div>
        
        <UpgradeAlert
          isOpen={upgradeAlert.isOpen}
          onClose={closeUpgradeAlert}
          feature={upgradeAlert.feature}
          requiredPlan={upgradeAlert.requiredPlan}
          currentPlan={currentPlan}
          isLimitReached={upgradeAlert.isLimitReached}
        />
      </div>
    );
  }
  
  // Card version (default or with preview image)
  return (
    <>
      <Card className={cn('relative overflow-hidden', className)}>
        {previewImage && (
          <div className="relative h-48 overflow-hidden">
            <img 
              src={previewImage} 
              alt={displayTitle}
              className="w-full h-full object-cover filter blur-[4px] opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </div>
        )}
        
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.3, delay: 0.1 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5"
            >
              <Sparkles className="h-6 w-6 text-primary" />
            </motion.div>
          </div>
          
          <Badge variant="outline" className="w-fit mx-auto mb-2 border-primary/30 text-primary">
            Disponível no {planLabels[requiredPlan]}
          </Badge>
          
          <CardTitle className="text-lg">{displayTitle}</CardTitle>
          <CardDescription className="text-sm">{displayDescription}</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-2">
          <div className="flex flex-col gap-2">
            <Button onClick={() => checkFeature(feature)} className="w-full gap-2">
              <Zap className="h-4 w-4" />
              {ctaLabel || `Fazer upgrade para ${planLabels[requiredPlan]}`}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/planos')} className="w-full">
              Comparar planos
            </Button>
          </div>
        </CardContent>
      </Card>
      
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

/**
 * Inline teaser for smaller contexts (buttons, menu items, etc.)
 */
export function FeatureTeaserInline({ 
  feature, 
  children,
  className,
}: {
  feature: FeatureKey;
  children: ReactNode;
  className?: string;
}) {
  const { getRequiredPlan, checkFeature, upgradeAlert, closeUpgradeAlert, currentPlan } = usePlanFeatures();
  const requiredPlan = getRequiredPlan(feature);
  
  return (
    <>
      <button 
        onClick={() => checkFeature(feature)}
        className={cn('relative group', className)}
      >
        <span className="opacity-50 pointer-events-none">{children}</span>
        <span className="absolute inset-0 flex items-center justify-center">
          <Badge variant="secondary" className="gap-1 text-xs">
            <Lock className="h-3 w-3" />
            {planLabels[requiredPlan]}
          </Badge>
        </span>
      </button>
      
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