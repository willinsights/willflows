import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export type InvoiceStatus = 'rascunho' | 'emitida' | 'paga' | 'vencida' | 'cancelada';

export interface ProjectInvoice {
  id: string;
  workspace_id: string;
  project_id: string;
  client_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  rascunho: 'Rascunho',
  emitida: 'Emitida',
  paga: 'Paga',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
};

export const invoiceStatusColors: Record<InvoiceStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  emitida: 'bg-primary/10 text-primary border-primary/20',
  paga: 'bg-success/10 text-success border-success/20',
  vencida: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelada: 'bg-muted text-muted-foreground',
};

export function useProjectInvoices(projectId?: string) {
  const { currentWorkspace } = useWorkspace();
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('issue_date', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Error fetching invoices:', error);
    } else {
      setInvoices((data || []) as ProjectInvoice[]);
    }
    setLoading(false);
  }, [currentWorkspace?.id, projectId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const generateInvoiceNumber = useCallback(async (): Promise<string> => {
    if (!currentWorkspace?.id) return 'FT-001';
    
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', currentWorkspace.id);

    const nextNum = (count || 0) + 1;
    const year = new Date().getFullYear();
    return `FT-${year}/${String(nextNum).padStart(3, '0')}`;
  }, [currentWorkspace?.id]);

  const addInvoice = async (invoice: {
    project_id: string;
    client_id?: string | null;
    subtotal: number;
    tax_rate?: number;
    due_date?: string;
    notes?: string;
  }) => {
    if (!currentWorkspace?.id) return null;

    const taxRate = invoice.tax_rate || 0;
    const taxAmount = invoice.subtotal * (taxRate / 100);
    const total = invoice.subtotal + taxAmount;
    const invoiceNumber = await generateInvoiceNumber();

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        workspace_id: currentWorkspace.id,
        project_id: invoice.project_id,
        client_id: invoice.client_id || null,
        invoice_number: invoiceNumber,
        subtotal: invoice.subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        due_date: invoice.due_date || null,
        notes: invoice.notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar fatura');
      logger.error(error);
      return null;
    }

    await fetchInvoices();
    toast.success('Fatura criada');
    return data as ProjectInvoice;
  };

  const updateInvoice = async (id: string, updates: Partial<Pick<ProjectInvoice, 'status' | 'subtotal' | 'tax_rate' | 'due_date' | 'notes'>>) => {
    const updateData: Record<string, unknown> = { ...updates };

    // Recalculate totals if subtotal or tax_rate changed
    if (updates.subtotal !== undefined || updates.tax_rate !== undefined) {
      const invoice = invoices.find(i => i.id === id);
      if (invoice) {
        const subtotal = updates.subtotal ?? invoice.subtotal;
        const taxRate = updates.tax_rate ?? invoice.tax_rate;
        updateData.subtotal = subtotal;
        updateData.tax_rate = taxRate;
        updateData.tax_amount = subtotal * (taxRate / 100);
        updateData.total = subtotal + (subtotal * (taxRate / 100));
      }
    }

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar fatura');
      logger.error(error);
      return false;
    }

    await fetchInvoices();
    return true;
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao remover fatura');
      logger.error(error);
      return false;
    }

    await fetchInvoices();
    toast.success('Fatura removida');
    return true;
  };

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paga').reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => ['emitida', 'vencida'].includes(i.status)).reduce((s, i) => s + i.total, 0);

  return {
    invoices,
    loading,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    refresh: fetchInvoices,
    generateInvoiceNumber,
    totalInvoiced,
    totalPaid,
    totalPending,
  };
}
