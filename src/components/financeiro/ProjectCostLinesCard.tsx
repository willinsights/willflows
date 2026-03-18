import { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Equal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useHideValues } from '@/hooks/useHideValues';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  useProjectCostLines,
  costCategoryLabels,
  costCategoryIcons,
  type CostCategory,
} from '@/hooks/useProjectCostLines';
import { paymentStatusLabels, paymentStatusColors } from '@/lib/finance/constants';
import { cn } from '@/lib/utils';

interface ProjectCostLinesCardProps {
  projectId: string;
}

const categories = Object.entries(costCategoryLabels) as [CostCategory, string][];

export function ProjectCostLinesCard({ projectId }: ProjectCostLinesCardProps) {
  const {
    costLines, loading, addCostLine, updateCostLine, deleteCostLine,
    totalEstimated, totalActual, variance, variancePercent,
  } = useProjectCostLines(projectId);
  const { hideValues } = useHideValues();
  const { formatCurrency } = useFormatCurrency();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<CostCategory>('outro');
  const [newDescription, setNewDescription] = useState('');
  const [newEstimated, setNewEstimated] = useState('');
  const [newActual, setNewActual] = useState('');

  const handleAdd = async () => {
    const estimated = parseFloat(newEstimated) || 0;
    if (estimated <= 0 && (parseFloat(newActual) || 0) <= 0) return;

    await addCostLine({
      project_id: projectId,
      category: newCategory,
      description: newDescription || undefined,
      estimated_amount: estimated,
      actual_amount: parseFloat(newActual) || 0,
    });

    setNewCategory('outro');
    setNewDescription('');
    setNewEstimated('');
    setNewActual('');
    setDialogOpen(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateCostLine(id, { payment_status: newStatus as 'pendente' | 'pago' | 'vencido' | 'cancelado' });
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Linhas de Custo</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Linha de Custo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={newCategory} onValueChange={v => setNewCategory(v as CostCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {costCategoryIcons[value]} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Ex: Aluguer de drone" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Estimado (€)</Label>
                  <Input type="number" min={0} step="0.01" value={newEstimated} onChange={e => setNewEstimated(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Real (€)</Label>
                  <Input type="number" min={0} step="0.01" value={newActual} onChange={e => setNewActual(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary row */}
        {costLines.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase">Estimado</p>
              <p className={cn("text-sm font-bold", hideValues && "blur-md select-none")}>{formatCurrency(totalEstimated)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase">Real</p>
              <p className={cn("text-sm font-bold", hideValues && "blur-md select-none")}>{formatCurrency(totalActual)}</p>
            </div>
            <div className={cn("text-center p-2 rounded-lg", variance > 0 ? "bg-destructive/5" : variance < 0 ? "bg-success/5" : "bg-muted/50")}>
              <p className="text-[10px] text-muted-foreground uppercase">Desvio</p>
              <div className="flex items-center justify-center gap-1">
                {variance > 0 ? <TrendingUp className="h-3 w-3 text-destructive" /> : variance < 0 ? <TrendingDown className="h-3 w-3 text-success" /> : <Equal className="h-3 w-3" />}
                <p className={cn("text-sm font-bold", variance > 0 ? "text-destructive" : variance < 0 ? "text-success" : "", hideValues && "blur-md select-none")}>
                  {variancePercent > 0 ? '+' : ''}{variancePercent}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cost lines list */}
        {costLines.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Sem linhas de custo registadas
          </div>
        ) : (
          <div className="space-y-2">
            {costLines.map(line => (
              <div key={line.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-lg shrink-0">{costCategoryIcons[line.category]}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {line.description || costCategoryLabels[line.category]}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn(hideValues && "blur-md select-none")}>Est: {formatCurrency(line.estimated_amount)}</span>
                      <span>→</span>
                      <span className={cn("font-medium", line.actual_amount > line.estimated_amount ? "text-destructive" : "text-success", hideValues && "blur-md select-none")}>
                        Real: {formatCurrency(line.actual_amount)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Select value={line.payment_status} onValueChange={v => handleStatusChange(line.id, v)}>
                    <SelectTrigger className={cn("h-7 text-[10px] w-auto min-w-[80px] border-0", paymentStatusColors[line.payment_status])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteCostLine(line.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
