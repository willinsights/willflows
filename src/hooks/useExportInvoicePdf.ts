import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useExportInvoicePdf() {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportPdf = useCallback(async (invoiceId: string, workspaceId: string, invoiceNumber: string) => {
    setExporting(invoiceId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-pdf`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoice_id: invoiceId, workspace_id: workspaceId }),
      });

      if (!res.ok) {
        let msg = 'Falha a gerar PDF';
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const blob = await res.blob();
      if (blob.type !== 'application/pdf' && !blob.type.includes('pdf')) {
        throw new Error('Resposta inválida do servidor');
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeNum = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `invoice-${safeNum}-${dateStr}.pdf`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success('PDF exportado');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro inesperado';
      toast.error(msg);
    } finally {
      setExporting(null);
    }
  }, []);

  return { exportPdf, exporting };
}
