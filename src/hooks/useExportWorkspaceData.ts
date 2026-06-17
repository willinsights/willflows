import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useExportWorkspaceData() {
  const [exporting, setExporting] = useState(false);

  const exportData = useCallback(async (workspaceId: string) => {
    if (!workspaceId) return;
    setExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('Sessão expirada. Inicia sessão novamente.');
        return;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-workspace-data`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const date = new Date().toISOString().slice(0, 10);
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `willflow-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      toast.success('Exportação concluída');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao exportar dados';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportData, exporting };
}
