import { supabase } from '@/integrations/supabase/client';

export type WorkspaceBillingAction = 'extend_trial' | 'convert_trial' | 'block' | 'unblock';

// This caller requires the separately authorized S02 candidate SQL to be applied.
// Values and authorization are decided by the server, never by browser roles/dates.
export async function manageWorkspaceBilling(
  workspaceId: string,
  action: WorkspaceBillingAction,
  options: { days?: number; reason?: string } = {},
): Promise<{ workspace_id: string; trial_ends_at: string | null }> {
  // The generated RPC types are intentionally not edited for an unapplied candidate.
  const { data, error } = await supabase.rpc('admin_manage_workspace_billing' as never, {
    p_workspace_id: workspaceId,
    p_action: action,
    p_days: options.days ?? null,
    p_reason: options.reason ?? null,
  } as never);
  if (error) throw error;
  const result: unknown = data;
  if (!result || typeof result !== 'object' || !('workspace_id' in result)
      || result.workspace_id !== workspaceId || !('trial_ends_at' in result)
      || (result.trial_ends_at !== null && typeof result.trial_ends_at !== 'string')) {
    throw new Error('Não foi possível confirmar a alteração administrativa.');
  }
  return { workspace_id: workspaceId, trial_ends_at: result.trial_ends_at };
}