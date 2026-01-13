import { motion } from 'framer-motion';
import { CreditCard, ArrowRight, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useNavigate } from 'react-router-dom';

interface PendingPaymentsCardProps {
  pendingPayments: number;
  pendingPaymentsCount: number;
  loading: boolean;
  /** For non-admins, show own pending payments */
  ownPendingPayments?: number;
  ownPendingPaymentsCount?: number;
}

export function PendingPaymentsCard({ 
  pendingPayments, 
  pendingPaymentsCount, 
  loading,
  ownPendingPayments = 0,
  ownPendingPaymentsCount = 0,
}: PendingPaymentsCardProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { canViewAllFinancials, canViewOwnFinancials } = useFinancialPermissions();
  const navigate = useNavigate();

  // Visualizador não vê este card
  if (!canViewOwnFinancials) {
    return null;
  }

  // Determinar valores a mostrar baseado nas permissões
  const displayValue = canViewAllFinancials ? pendingPayments : ownPendingPayments;
  const displayCount = canViewAllFinancials ? pendingPaymentsCount : ownPendingPaymentsCount;
  const cardTitle = canViewAllFinancials ? 'Pagamentos Pendentes' : 'Seus Pagamentos';
  const subtitle = canViewAllFinancials 
    ? `${displayCount} pagamento(s) por receber`
    : `${displayCount} pagamento(s) a receber`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="flex-1"
    >
      <Card className="glass-card h-full min-h-[130px]">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            {cardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-between">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <p className="text-2xl font-bold text-warning">{formatCurrency(displayValue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs px-3" 
              onClick={() => navigate('/app/pagamentos')}
            >
              Ver
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
