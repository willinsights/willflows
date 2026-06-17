import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { logger } from '@/lib/logger';

export type VatSource = 'workspace' | 'client' | 'exempt';

export interface EffectiveVat {
  vat_rate: number;
  vat_regime: string;
  source: VatSource;
}

const FALLBACK: EffectiveVat = { vat_rate: 23, vat_regime: 'standard', source: 'workspace' };

const sourceLabels: Record<VatSource, string> = {
  workspace: 'taxa padrão do workspace',
  client: 'override do cliente',
  exempt: 'cliente isento',
};

export function vatSourceLabel(source: VatSource): string {
  return sourceLabels[source] ?? sourceLabels.workspace;
}

export function useEffectiveVat(clientId?: string | null) {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<EffectiveVat | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspace?.id) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: rows, error } = await supabase.rpc('get_effective_vat', {
        p_workspace_id: workspace.id,
        p_client_id: clientId ?? undefined,
      });
      if (cancelled) return;
      if (error || !rows || rows.length === 0) {
        if (error) logger.error('get_effective_vat error', error);
        setData(FALLBACK);
      } else {
        const r = rows[0];
        setData({
          vat_rate: Number(r.vat_rate) || 0,
          vat_regime: r.vat_regime || 'standard',
          source: (r.source as VatSource) || 'workspace',
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace?.id, clientId]);

  return { effectiveVat: data, loading };
}
