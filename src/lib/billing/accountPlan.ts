/**
 * Regras de leitura do plano da conta usadas pelos ecrãs de compra.
 * Funções puras: o servidor continua a ser a autoridade sobre planos e limites.
 */

/** A conta tem um plano pago ativo (subscrição paga ou plano atribuído). */
export function hasActivePaidPlan(status: string | null | undefined): boolean {
  return status === 'active';
}

/** A conta tem workspace próprio quando é administradora de pelo menos um. */
export function hasOwnWorkspace(workspaces: ReadonlyArray<{ role: string }>): boolean {
  return workspaces.some((workspace) => workspace.role === 'admin');
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  studio: 'Studio',
};

export function getAccountPlanLabel(plan: string | null | undefined): string | null {
  if (!plan) return null;
  return PLAN_LABELS[plan] ?? null;
}

/**
 * Mensagem para a recusa WORKSPACE_LIMIT_REACHED na criação de workspace.
 * Sem plano pago ativo (teste expirado ou sem plano) não há «plano superior»
 * que resolva: é preciso um plano ativo.
 */
export function getWorkspaceLimitMessage(accountStatus: string | null | undefined): string {
  return hasActivePaidPlan(accountStatus)
    ? 'A sua conta já atingiu o número de workspaces incluído no plano. Para criar mais um, mude para um plano superior.'
    : 'Para criar mais workspaces é preciso um plano ativo.';
}

export interface WaitForConfirmationOptions {
  /** Devolve `true` quando o plano já está confirmado na conta. */
  check: () => Promise<boolean>;
  attempts?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  isCancelled?: () => boolean;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Relê o estado da conta até o plano estar confirmado ou esgotar as tentativas
 * (por omissão 10 leituras com 2 s de intervalo, cerca de 20 s).
 * Uma leitura que falha conta como «ainda não confirmado».
 */
export async function waitForPlanConfirmation({
  check,
  attempts = 10,
  intervalMs = 2000,
  sleep = defaultSleep,
  isCancelled = () => false,
}: WaitForConfirmationOptions): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (isCancelled()) return false;
    try {
      if (await check()) return true;
    } catch {
      // leitura falhada: tenta-se de novo
    }
    if (attempt < attempts - 1) await sleep(intervalMs);
  }
  return false;
}
