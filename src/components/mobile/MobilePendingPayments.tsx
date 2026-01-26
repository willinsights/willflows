import { motion } from 'framer-motion';
import { CreditCard, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { PendingPaymentItem } from '@/components/dashboard/PendingPaymentsList';

interface MobilePendingPaymentsProps {
  payments: PendingPaymentItem[];
  totalAmount: number;
  loading: boolean;
  maxItems?: number;
}

export function MobilePendingPayments({ 
  payments, 
  totalAmount,
  loading,
  maxItems = 3,
}: MobilePendingPaymentsProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const navigate = useNavigate();
  
  const displayedPayments = payments.slice(0, maxItems);
  const hasMore = payments.length > maxItems;
  const overdueCount = payments.filter(p => p.isOverdue).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-warning/10">
              <CreditCard className="h-4 w-4 text-warning" />
            </div>
            Pagamentos Pendentes
            {overdueCount > 0 && (
              <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs px-2" 
            onClick={() => navigate('/app/pagamentos')}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="py-4 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum pagamento pendente
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {displayedPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      payment.isOverdue 
                        ? 'border-destructive/30 bg-destructive/5' 
                        : 'border-border/50 bg-muted/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {payment.clientName || payment.projectName || payment.description || 'Pagamento'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {payment.dueDate && (
                          <span className={`text-xs ${payment.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {format(parseISO(payment.dueDate), "d MMM", { locale: pt })}
                          </span>
                        )}
                        {payment.isOverdue && (
                          <Badge variant="destructive" className="h-4 text-[9px] px-1">
                            <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                            Vencido
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap ml-3 ${
                      payment.isOverdue ? 'text-destructive' : 'text-warning'
                    }`}>
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Total Summary */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  Total ({payments.length})
                </span>
                <span className="text-base font-bold text-warning">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              
              {hasMore && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2 text-primary" 
                  onClick={() => navigate('/app/pagamentos')}
                >
                  Ver todos ({payments.length})
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
