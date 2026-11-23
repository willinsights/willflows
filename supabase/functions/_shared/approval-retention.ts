// Retention rule (owner decision 2026-11-23): review videos uploaded to WillFlow
// exist only for approval. They are removed from Cloudflare 7 days after the
// approval, never because a project was delivered. Applies to legacy versions;
// the private registry (wf2_) is not reached by this selector.
export const APPROVAL_RETENTION_DAYS = 7;

export function approvalRetentionCutoff(now: Date, days = APPROVAL_RETENTION_DAYS): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export type RetentionApproval = {
  video_version_id: string | null;
  task_id: string | null;
  approved_at: string;
};

export type RetentionVersion = {
  id: string;
  task_id: string | null;
  is_deleted: boolean | null;
};

/**
 * Returns the ids of live versions that are due for removal: the approved
 * version itself and, when the approval belongs to a task, every earlier
 * version of that task (same scope as the approval-queue path). Approvals
 * newer than the cutoff are ignored, as are versions already deleted.
 */
export function selectVersionsDueAfterApproval(
  approvals: RetentionApproval[],
  versions: RetentionVersion[],
  cutoffIso: string,
): string[] {
  const cutoff = Date.parse(cutoffIso);
  const dueVersionIds = new Set<string>();
  const dueTaskIds = new Set<string>();
  for (const a of approvals) {
    const at = Date.parse(a.approved_at);
    if (!Number.isFinite(at) || at >= cutoff) continue;
    if (a.video_version_id) dueVersionIds.add(a.video_version_id);
    if (a.task_id) dueTaskIds.add(a.task_id);
  }
  // A newer approval on the same task restarts its 7-day window.
  for (const a of approvals) {
    const at = Date.parse(a.approved_at);
    if (a.task_id && Number.isFinite(at) && at >= cutoff) dueTaskIds.delete(a.task_id);
  }
  return versions
    .filter((v) => v.is_deleted !== true)
    .filter((v) =>
      (v.task_id ? dueTaskIds.has(v.task_id) : false) ||
      (dueVersionIds.has(v.id) && !(v.task_id && hasRecentTaskApproval(approvals, v.task_id, cutoff))),
    )
    .map((v) => v.id);
}

function hasRecentTaskApproval(approvals: RetentionApproval[], taskId: string, cutoff: number): boolean {
  return approvals.some((a) => a.task_id === taskId && Date.parse(a.approved_at) >= cutoff);
}
