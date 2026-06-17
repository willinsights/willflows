import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HardDrive, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStorage } from '@/hooks/useWorkspaceStorage';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';

interface StorageUsageBarProps {
  showUpgradeButton?: boolean;
  className?: string;
}

export function StorageUsageBar({ showUpgradeButton = true, className }: StorageUsageBarProps) {
  const { storage, loading } = useWorkspaceStorage();
  const { hasFeatureAccess } = usePlanFeatures();
  
  // Only show for Studio plan
  if (!hasFeatureAccess('videoApproval')) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  const getStatusColor = () => {
    if (storage.isFull) return 'bg-destructive';
    if (storage.isNearLimit) return 'bg-warning';
    return 'bg-primary';
  };

  const getTextColor = () => {
    if (storage.isFull) return 'text-destructive';
    if (storage.isNearLimit) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className={getTextColor()}>
            {storage.usedGB.toFixed(2)} GB / {storage.limitGB.toFixed(0)} GB
          </span>
        </div>
        {showUpgradeButton && storage.isNearLimit && (
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        )}
      </div>
      <Progress
        value={Math.min(storage.percentUsed, 100)}
        className={cn("h-2", storage.isFull && "[&>div]:bg-destructive", storage.isNearLimit && !storage.isFull && "[&>div]:bg-warning")}
      />
      {storage.isFull && (
        <p className="text-xs text-destructive">
          Armazenamento cheio. Apague vídeos antigos ou adicione mais espaço.
        </p>
      )}
    </div>
  );
}
