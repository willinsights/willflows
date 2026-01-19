import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from './useSuperAdmin';

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin_profile?: {
    full_name: string | null;
    email: string;
  };
}

export function useAdminAudit() {
  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select(`
          *,
          admin_profile:profiles!admin_audit_log_admin_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  const logAction = useMutation({
    mutationFn: async ({
      action,
      targetType,
      targetId,
      details,
    }: {
      action: string;
      targetType: string;
      targetId: string;
      details?: Record<string, string | number | boolean | null>;
    }) => {
      const { data, error } = await supabase.rpc('log_admin_action', {
        p_action: action,
        p_target_type: targetType,
        p_target_id: targetId,
        p_details: details || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
  });

  return {
    auditLogs,
    isLoading,
    logAction: logAction.mutateAsync,
  };
}
