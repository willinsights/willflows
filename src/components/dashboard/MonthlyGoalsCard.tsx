import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Pencil, Lock, Check, X, Trophy, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useWorkspaceGoals } from '@/hooks/useWorkspaceGoals';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useHideValues } from '@/hooks/useHideValues';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface MonthlyGoalsCardProps {
  currentRevenue: number;
  currentProjectsDelivered: number;
  loading: boolean;
}

export function MonthlyGoalsCard({ 
  currentRevenue, 
  currentProjectsDelivered, 
  loading: metricsLoading 
}: MonthlyGoalsCardProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { canViewAllFinancials, userRole } = useFinancialPermissions();
  const { goal, loading: goalLoading, saveGoal } = useWorkspaceGoals();
  const { hideValues } = useHideValues();
  
  const [isEditing, setIsEditing] = useState(false);
  const [revenueGoal, setRevenueGoal] = useState('');
  const [projectsGoal, setProjectsGoal] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = userRole === 'admin';
  const loading = metricsLoading || goalLoading;

  // Se não for admin, não mostra o card
  if (!canViewAllFinancials) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="glass-card h-full opacity-60">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/50">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              Metas Mensais
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[160px] flex flex-col items-center justify-center text-center">
              <Lock className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Apenas administradores
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const revenueTarget = goal?.revenue_goal || 0;
  const projectsTarget = goal?.projects_goal || 0;
  
  const revenueProgress = revenueTarget > 0 
    ? Math.min(100, Math.round((currentRevenue / revenueTarget) * 100))
    : 0;
  
  const projectsProgress = projectsTarget > 0
    ? Math.min(100, Math.round((currentProjectsDelivered / projectsTarget) * 100))
    : 0;

  const handleStartEdit = () => {
    setRevenueGoal(revenueTarget.toString());
    setProjectsGoal(projectsTarget.toString());
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGoal(parseFloat(revenueGoal) || 0, parseInt(projectsGoal) || 0);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const currentMonthName = format(new Date(), 'MMMM yyyy', { locale: pt });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card className="glass-card h-full">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            Metas de {currentMonthName}
          </CardTitle>
          {isAdmin && !isEditing && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={handleStartEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-success hover:text-success"
                onClick={handleSave}
                disabled={saving}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Meta de Receita
                </label>
                <CurrencyInput
                  value={revenueGoal ? parseFloat(revenueGoal) : null}
                  onChange={(value) => setRevenueGoal(value?.toString() || '')}
                  placeholder="Ex: 15000"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Meta de Projetos Entregues
                </label>
                <Input
                  type="number"
                  value={projectsGoal}
                  onChange={(e) => setProjectsGoal(e.target.value)}
                  placeholder="Ex: 10"
                  className="h-9"
                />
              </div>
            </div>
          ) : revenueTarget === 0 && projectsTarget === 0 ? (
            <div className="h-[140px] flex flex-col items-center justify-center text-center">
              <Target className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Nenhuma meta definida
              </p>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Definir metas
                </Button>
              )}
            </div>
          ) : (
          <div className="space-y-4">
              {/* Receita */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Receita</span>
                  <div className="flex items-center gap-1.5">
                    {revenueProgress >= 100 && (
                      <span className="flex items-center gap-0.5 text-success text-[10px] font-medium">
                        <Trophy className="h-3 w-3" />
                        Meta atingida!
                      </span>
                    )}
                    <span className="text-xs font-medium">
                      {revenueProgress}%
                    </span>
                  </div>
                </div>
                <Progress value={revenueProgress} className="h-2" />
                <div className="flex items-center justify-between mt-1">
                  <span className={cn("text-sm font-semibold text-foreground", hideValues && "blur-md select-none")}>
                    {formatCurrency(currentRevenue)}
                  </span>
                  <span className={cn("text-xs text-muted-foreground", hideValues && "blur-md select-none")}>
                    / {formatCurrency(revenueTarget)}
                  </span>
                </div>
              </div>

              {/* Projetos */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Projetos Entregues</span>
                  <div className="flex items-center gap-1.5">
                    {projectsProgress >= 100 && (
                      <span className="flex items-center gap-0.5 text-success text-[10px] font-medium">
                        <PartyPopper className="h-3 w-3" />
                        Meta atingida!
                      </span>
                    )}
                    <span className="text-xs font-medium">
                      {projectsProgress}%
                    </span>
                  </div>
                </div>
                <Progress value={projectsProgress} className="h-2" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-foreground">
                    {currentProjectsDelivered}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {projectsTarget}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
