import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Calendar, Info, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHideValues } from '@/hooks/useHideValues';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useEffectiveVat, vatSourceLabel } from '@/hooks/useEffectiveVat';
import {
  useProjectInvoices,
  invoiceStatusLabels,
  invoiceStatusColors,
  type InvoiceStatus,
} from '@/hooks/useProjectInvoices';
import { cn } from '@/lib/utils';

interface ProjectInvoicesCardProps {
  projectId: string;
  clientId?: string | null;
}

const statusEntries = Object.entries(invoiceStatusLabels) as [InvoiceStatus, string][];

export function ProjectInvoicesCard({ projectId, clientId }: ProjectInvoicesCardProps) {
  const {
    invoices, loading, addInvoice, updateInvoice, deleteInvoice,
    totalInvoiced, totalPaid, totalPending,
  } = useProjectInvoices(projectId);
  const { hideValues } = useHideValues();
  const { formatCurrency } = useFormatCurrency();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSubtotal, setNewSubtotal] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('23');
  const [customizeVat, setCustomizeVat] = useState(false);
  const [vatReason, setVatReason] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const { effectiveVat } = useEffectiveVat(clientId);

  // Pre-fill IVA rate from effective VAT cascade whenever dialog opens or cascade resolves
  useEffect(() => {
    if (!customizeVat && effectiveVat) {
      setNewTaxRate(String(effectiveVat.vat_rate));
    }
  }, [effectiveVat, customizeVat, dialogOpen]);

  const isExempt = effectiveVat?.source === 'exempt';

  const handleAdd = async () => {
    const subtotal = parseFloat(newSubtotal) || 0;
    if (subtotal <= 0) return;

    await addInvoice({
      project_id: projectId,
      client_id: clientId,
      subtotal,
      tax_rate: parseFloat(newTaxRate) || 0,
      due_date: newDueDate || undefined,
      notes: newNotes || undefined,
      vat_regime_applied: customizeVat ? 'manual' : effectiveVat?.vat_regime,
      vat_override_reason: customizeVat ? (vatReason || null) : null,
    });

    setNewSubtotal('');
    setNewTaxRate(effectiveVat ? String(effectiveVat.vat_rate) : '23');
    setCustomizeVat(false);
    setVatReason('');
    setNewDueDate('');
    setNewNotes('');
    setDialogOpen(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateInvoice(id, { status: newStatus as InvoiceStatus });
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Faturas</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />
              Nova Fatura
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Fatura</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Subtotal (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newSubtotal}
                  onChange={e => setNewSubtotal(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* VAT section */}
              <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">IVA</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          Esta taxa vem de: {effectiveVat ? vatSourceLabel(effectiveVat.source) : 'taxa padrão do workspace'}.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="vat-custom" className="text-[11px] text-muted-foreground">Personalizar</Label>
                    <Switch
                      id="vat-custom"
                      checked={customizeVat}
                      onCheckedChange={(v) => {
                        setCustomizeVat(v);
                        if (!v && effectiveVat) setNewTaxRate(String(effectiveVat.vat_rate));
                      }}
                      disabled={isExempt}
                    />
                  </div>
                </div>

                {isExempt && (
                  <Badge variant="outline" className="gap-1 border-warning/40 bg-warning/10 text-warning text-[11px]">
                    <AlertTriangle className="h-3 w-3" /> Cliente isento — taxa 0%
                  </Badge>
                )}

                {!isExempt && !customizeVat && (
                  <p className="text-[11px] text-muted-foreground">
                    {newTaxRate}% — {effectiveVat ? vatSourceLabel(effectiveVat.source) : 'taxa padrão do workspace'}
                  </p>
                )}

                {customizeVat && !isExempt && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Taxa (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={newTaxRate}
                        onChange={e => setNewTaxRate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Razão</Label>
                      <Input
                        value={vatReason}
                        onChange={e => setVatReason(e.target.value)}
                        placeholder="Ex.: IVA reverso UE"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {parseFloat(newSubtotal) > 0 && (
                <div className="text-sm space-y-1 bg-muted/40 p-2.5 rounded">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(parseFloat(newSubtotal) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA ({newTaxRate}%):</span>
                    <span>{formatCurrency((parseFloat(newSubtotal) || 0) * (parseFloat(newTaxRate) || 0) / 100)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                    <span>Total:</span>
                    <span>{formatCurrency((parseFloat(newSubtotal) || 0) * (1 + (parseFloat(newTaxRate) || 0) / 100))}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Observações..."
                  rows={2}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">Criar Fatura</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase">Faturado</p>
              <p className={cn("text-sm font-bold", hideValues && "blur-md select-none")}>
                {formatCurrency(totalInvoiced)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-success/5">
              <p className="text-[10px] text-muted-foreground uppercase">Recebido</p>
              <p className={cn("text-sm font-bold text-success", hideValues && "blur-md select-none")}>
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-warning/5">
              <p className="text-[10px] text-muted-foreground uppercase">Pendente</p>
              <p className={cn("text-sm font-bold text-warning", hideValues && "blur-md select-none")}>
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        )}

        {/* Invoice list */}
        {invoices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Sem faturas registadas
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.invoice_number}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn(hideValues && "blur-md select-none")}>
                        {formatCurrency(inv.total)}
                      </span>
                      {inv.tax_rate > 0 && (
                        <span className="text-[10px]">({inv.tax_rate}% IVA)</span>
                      )}
                      {inv.due_date && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(inv.due_date), 'dd MMM', { locale: pt })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Select
                    value={inv.status}
                    onValueChange={v => handleStatusChange(inv.id, v)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-7 text-[10px] w-auto min-w-[80px] border-0",
                        invoiceStatusColors[inv.status]
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusEntries.map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteInvoice(inv.id)}
                  >
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
