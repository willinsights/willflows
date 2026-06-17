import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInvoiceItems, type InvoiceItemDraft } from '@/hooks/useInvoiceItems';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { toast } from 'sonner';

interface InvoiceItemsEditorProps {
  invoiceId: string;
  workspaceId: string;
  onSaved?: () => void;
}

export function InvoiceItemsEditor({ invoiceId, workspaceId, onSaved }: InvoiceItemsEditorProps) {
  const { items, loading, upsertItems } = useInvoiceItems(invoiceId);
  const { formatCurrency } = useFormatCurrency();
  const [drafts, setDrafts] = useState<InvoiceItemDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      setDrafts(items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        sort_order: it.sort_order,
      })));
    } else if (drafts.length === 0) {
      setDrafts([{ description: '', quantity: 1, unit_price: 0, sort_order: 0 }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const updateDraft = (idx: number, patch: Partial<InvoiceItemDraft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const addRow = () => {
    setDrafts((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, sort_order: prev.length }]);
  };

  const removeRow = (idx: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = drafts.reduce((s, d) => s + (d.quantity || 0) * (d.unit_price || 0), 0);

  const handleSave = async () => {
    const valid = drafts.filter((d) => d.description.trim() && d.quantity > 0);
    if (valid.length === 0) {
      toast.error('Adiciona pelo menos um item válido');
      return;
    }
    setSaving(true);
    try {
      await upsertItems(invoiceId, workspaceId, valid);
      toast.success('Itens guardados');
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro a guardar itens');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
        A carregar itens…
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-muted-foreground font-semibold">
        <div className="col-span-6">Descrição</div>
        <div className="col-span-2 text-right">Qtd</div>
        <div className="col-span-2 text-right">Preço unit.</div>
        <div className="col-span-2 text-right">Subtotal</div>
      </div>

      {drafts.map((d, idx) => {
        const rowSubtotal = (d.quantity || 0) * (d.unit_price || 0);
        return (
          <div key={d.id ?? `new-${idx}`} className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-6 h-8 text-xs"
              placeholder="Descrição do serviço"
              value={d.description}
              onChange={(e) => updateDraft(idx, { description: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              step="0.5"
              className="col-span-2 h-8 text-xs text-right"
              value={d.quantity}
              onChange={(e) => updateDraft(idx, { quantity: parseFloat(e.target.value) || 0 })}
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              className="col-span-2 h-8 text-xs text-right"
              value={d.unit_price}
              onChange={(e) => updateDraft(idx, { unit_price: parseFloat(e.target.value) || 0 })}
            />
            <div className="col-span-1 text-right text-xs font-medium tabular-nums">
              {formatCurrency(rowSubtotal)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="col-span-1 h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeRow(idx)}
              disabled={drafts.length === 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addRow}>
          <Plus className="h-3 w-3" /> Adicionar item
        </Button>
        <div className="text-xs">
          <span className="text-muted-foreground mr-2">Subtotal:</span>
          <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
      </div>

      <Button size="sm" className="w-full h-8" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar itens'}
      </Button>
    </div>
  );
}
