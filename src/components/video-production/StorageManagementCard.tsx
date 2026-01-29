import { useState } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Plus, Trash2, Loader2, ExternalLink, AlertTriangle, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceStorage } from '@/hooks/useWorkspaceStorage';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_ADDON_PRICES, type StorageAddonTier, type Currency } from '@/lib/plans';
import { cn } from '@/lib/utils';

interface StorageManagementCardProps {
  className?: string;
}

export function StorageManagementCard({ className }: StorageManagementCardProps) {
  const { storage, storageData, loading, recalculate, isRecalculating } = useWorkspaceStorage();
  const { workspace, currentWorkspace, isAdmin } = useWorkspace();
  const { hasFeatureAccess, currentPlan } = usePlanFeatures();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState<StorageAddonTier | null>(null);

  // Only show for Studio plan
  if (!hasFeatureAccess('videoApproval')) {
    return null;
  }

  const currency: Currency = (currentWorkspace?.currency?.toLowerCase() === 'brl' ? 'brl' : 'eur');
  const currencySymbol = currency === 'eur' ? '€' : 'R$';

  const handlePurchaseAddon = async (tier: StorageAddonTier) => {
    if (!isAdmin) {
      toast({
        title: 'Sem permissão',
        description: 'Apenas administradores podem comprar armazenamento extra.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCheckoutLoading(tier);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-storage-addon-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { tier, workspaceId: currentWorkspace?.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getStatusColor = () => {
    if (storage.isFull) return 'text-destructive';
    if (storage.isNearLimit) return 'text-warning';
    return 'text-primary';
  };

  const getProgressColor = () => {
    if (storage.isFull) return '[&>div]:bg-destructive';
    if (storage.isNearLimit) return '[&>div]:bg-warning';
    return '';
  };

  if (loading) {
    return (
      <Card className={cn("glassmorphism-card", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentAddonTier = storageData?.addon_tier as StorageAddonTier | null;

  return (
    <Card className={cn("glassmorphism-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Armazenamento de Vídeos</CardTitle>
          </div>
          {currentAddonTier && (
            <Badge variant="secondary" className="text-xs">
              {STORAGE_ADDON_PRICES[currentAddonTier].displayName} ativo
            </Badge>
          )}
        </div>
        <CardDescription>
          Gerir o armazenamento para aprovação de vídeos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Espaço utilizado</span>
            <span className={cn("font-medium", getStatusColor())}>
              {storage.usedGB.toFixed(2)} GB / {storage.limitGB.toFixed(0)} GB
            </span>
          </div>
          <Progress
            value={Math.min(storage.percentUsed, 100)}
            className={cn("h-3", getProgressColor())}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{storage.percentUsed.toFixed(1)}% utilizado</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => recalculate()}
              disabled={isRecalculating}
            >
              {isRecalculating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              Recalcular
            </Button>
          </div>
        </div>

        {/* Warning if near limit or full */}
        {storage.isFull && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">
              Armazenamento cheio. Não é possível fazer upload de novos vídeos.
            </p>
          </div>
        )}

        {storage.isNearLimit && !storage.isFull && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
            <p className="text-xs text-warning">
              Espaço quase esgotado. Considere adicionar mais armazenamento.
            </p>
          </div>
        )}

        {/* Storage Plans */}
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium">Adicionar armazenamento</p>
          <div className="grid gap-2">
            {(Object.keys(STORAGE_ADDON_PRICES) as StorageAddonTier[]).map((tier) => {
              const addon = STORAGE_ADDON_PRICES[tier];
              const isCurrentTier = currentAddonTier === tier;
              const price = addon.price[currency];

              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    isCurrentTier 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div>
                    <p className="font-medium">{addon.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {currencySymbol}{price}/mês
                    </p>
                  </div>
                  {isCurrentTier ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Ativo
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant={storage.isFull || storage.isNearLimit ? "default" : "outline"}
                      onClick={() => handlePurchaseAddon(tier)}
                      disabled={checkoutLoading === tier || !isAdmin}
                    >
                      {checkoutLoading === tier ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground pt-2">
          O armazenamento base incluído no plano Studio é de 10 GB. 
          Os vídeos são automaticamente eliminados 14 dias após a aprovação.
        </p>
      </CardContent>
    </Card>
  );
}
