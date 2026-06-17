import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  workspace_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  sort_order: number;
  created_at: string;
}

export interface InvoiceItemDraft {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

export function useInvoiceItems(invoiceId: string | null | undefined) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!invoiceId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true });
    setLoading(false);
    if (error) {
      toast.error('Erro a carregar itens da fatura');
      return;
    }
    setItems((data || []) as InvoiceItem[]);
  }, [invoiceId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const upsertItems = useCallback(
    async (targetInvoiceId: string, workspaceId: string, drafts: InvoiceItemDraft[]) => {
      // Fetch existing IDs for diff
      const { data: existing } = await supabase
        .from('invoice_items')
        .select('id')
        .eq('invoice_id', targetInvoiceId);

      const existingIds = new Set((existing || []).map((r) => r.id));
      const keptIds = new Set(drafts.filter((d) => d.id).map((d) => d.id!));

      // Delete removed
      const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('invoice_items')
          .delete()
          .in('id', toDelete);
        if (delErr) throw delErr;
      }

      // Upsert remaining
      if (drafts.length > 0) {
        const payload = drafts.map((d, idx) => ({
          ...(d.id ? { id: d.id } : {}),
          invoice_id: targetInvoiceId,
          workspace_id: workspaceId,
          description: d.description,
          quantity: d.quantity,
          unit_price: d.unit_price,
          sort_order: idx,
        }));
        const { error: upErr } = await supabase
          .from('invoice_items')
          .upsert(payload, { onConflict: 'id' });
        if (upErr) throw upErr;
      }

      await fetchItems();
    },
    [fetchItems],
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      const { error } = await supabase.from('invoice_items').delete().eq('id', itemId);
      if (error) {
        toast.error('Erro a apagar item');
        return;
      }
      await fetchItems();
    },
    [fetchItems],
  );

  return { items, loading, fetchItems, upsertItems, deleteItem };
}
