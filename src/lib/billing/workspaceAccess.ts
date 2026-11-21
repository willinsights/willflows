/**
 * Regra única de acesso a um workspace, igual à do servidor (`workspace_is_active`).
 *
 * - `active` → ativo.
 * - `past_due` → ativo durante 7 dias a contar de `past_due_since`. Sem data
 *   registada conta como «agora» (o servidor usa `coalesce(past_due_since, now())`).
 * - `trialing` → ativo só com `trial_ends_at` preenchido e no futuro.
 * - Qualquer outro estado → inativo.
 */

export const PAST_DUE_GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type WorkspaceAccessReason =
  | 'active'
  | 'trial'
  | 'past_due_grace'
  | 'past_due_expired'
  | 'trial_expired'
  | 'trial_no_end'
  | 'canceled'
  | 'other';

export interface WorkspaceAccessInput {
  status: string | null | undefined;
  trialEndsAt: string | null | undefined;
  pastDueSince: string | null | undefined;
  /** Instante de referência em milissegundos (por omissão, agora). */
  now?: number;
}

export interface WorkspaceAccessState {
  active: boolean;
  reason: WorkspaceAccessReason;
  /** Fim da tolerância de pagamento em atraso (só em `past_due`). */
  graceEndsAt?: Date;
  /** Dias inteiros que faltam (arredondados para cima); 0 quando já terminou. */
  daysLeft?: number;
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function daysUntil(deadline: number, now: number): number {
  const diff = deadline - now;
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}

export function getWorkspaceAccessState({
  status,
  trialEndsAt,
  pastDueSince,
  now = Date.now(),
}: WorkspaceAccessInput): WorkspaceAccessState {
  if (status === 'active') return { active: true, reason: 'active' };

  if (status === 'past_due') {
    const since = parseTime(pastDueSince) ?? now;
    const graceEnds = since + PAST_DUE_GRACE_DAYS * DAY_MS;
    const active = graceEnds > now;
    return {
      active,
      reason: active ? 'past_due_grace' : 'past_due_expired',
      graceEndsAt: new Date(graceEnds),
      daysLeft: daysUntil(graceEnds, now),
    };
  }

  if (status === 'trialing') {
    const end = parseTime(trialEndsAt);
    if (end === null) return { active: false, reason: 'trial_no_end' };
    if (end > now) return { active: true, reason: 'trial', daysLeft: daysUntil(end, now) };
    return { active: false, reason: 'trial_expired', daysLeft: 0 };
  }

  if (status === 'canceled') return { active: false, reason: 'canceled' };

  return { active: false, reason: 'other' };
}
