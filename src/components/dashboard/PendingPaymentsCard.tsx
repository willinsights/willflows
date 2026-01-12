import { motion } from 'framer-motion';
import { CreditCard, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useNavigate } from 'react-router-dom';

interface PendingPaymentsCardProps {
  pendingPayments: number;
  pendingPaymentsCount: number;
  loading: boolean;
}

export function PendingPaymentsCard({ pendingPayments, pendingPaymentsCount, loading }: PendingPaymentsCardProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const navigate = useNavigate();

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
            Pagamentos Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-between">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <p className="text-2xl font-bold text-warning">{formatCurrency(pendingPayments)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pendingPaymentsCount} pagamento(s) por receber
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
