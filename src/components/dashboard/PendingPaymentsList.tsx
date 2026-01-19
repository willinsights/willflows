import { motion } from 'framer-motion';
import { CreditCard, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useNavigate } from 'react-router-dom';
import { format, isPast, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export interface PendingPaymentItem {
  id: string;
  description: string | null;
  amount: number;
  dueDate: string | null;
  clientName: string | null;
  projectName: string | null;
  isOverdue: boolean;
}

interface PendingPaymentsListProps {
  payments: PendingPaymentItem[];
  totalAmount: number;
  loading: boolean;
}

export function PendingPaymentsList({ 
  payments, 
  totalAmount,
  loading,
}: PendingPaymentsListProps) {
  const { formatCurrency } = useCurrentWorkspace();
  const { canViewAllFinancials, canViewOwnFinancials } = useFinancialPermissions();
  const navigate = useNavigate();

  // Visualizador não vê este card
  if (!canViewOwnFinancials) {
    return null;
  }

  // Se não for admin, mostrar versão simplificada
  if (!canViewAllFinancials) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex-1"
      >
        <Card className="glass-card h-full opacity-60">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/50">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              Pagamentos por Receber
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[180px] flex flex-col items-center justify-center text-center">
              <Lock className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">Apenas administradores</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="flex-1"
    >
      <Card className="glass-card h-full min-h-[220px]">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-warning/10">
              <CreditCard className="h-4 w-4 text-warning" />
            </div>
            Pagamentos por Receber
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs px-2" 
            onClick={() => navigate('/app/pagamentos')}
          >
            Ver todos
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="h-[140px] flex flex-col items-center justify-center text-center">
              <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum pagamento pendente
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[140px] pr-2">
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        payment.isOverdue 
                          ? 'border-destructive/30 bg-destructive/5' 
                          : 'border-border/50 bg-muted/30 hover:bg-muted/50'
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
                            <Badge variant="destructive" className="h-4 text-[10px] px-1">
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
              </ScrollArea>
              
              {/* Total Summary */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  Total ({payments.length} pagamento{payments.length !== 1 ? 's' : ''})
                </span>
                <span className="text-base font-bold text-warning">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
