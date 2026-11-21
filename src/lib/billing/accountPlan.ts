/**
 * Regras de leitura do plano da conta usadas pelos ecrãs de compra.
 * Funções puras: o servidor continua a ser a autoridade sobre planos e limites.
 */

/** A conta tem um plano pago ativo (subscrição paga ou plano atribuído). */
export function hasActivePaidPlan(status: string | null | undefined): boolean {
  return status === 'active';
}

/**
 * Dono do workspace = o PRIMEIRO administrador (coluna `owner_id`).
 * Outros administradores administram, mas não são donos: não compram nem gerem
 * o plano do workspace, e o workspace não conta para o limite deles.
 * Sem dono registado (`owner_id` nulo) ninguém é dono.
 */
export interface WorkspaceOwnerRef {
  owner_id?: string | null;
}

/** Único sítio que decide «sou dono deste workspace?». Função pura. */
export function isWorkspaceOwner(
  workspace: WorkspaceOwnerRef | null | undefined,
  userId: string | null | undefined,
): boolean {
  const ownerId = workspace?.owner_id;
  return typeof ownerId === 'string' && ownerId.length > 0 && !!userId && ownerId === userId;
}

/** Workspaces de que a conta é dona (os únicos que contam para o limite). */
export function getOwnedWorkspaces<T extends WorkspaceOwnerRef>(
  workspaces: ReadonlyArray<T> | null | undefined,
  userId: string | null | undefined,
): T[] {
  return (workspaces ?? []).filter((workspace) => isWorkspaceOwner(workspace, userId));
}

export function countOwnedWorkspaces(
  workspaces: ReadonlyArray<WorkspaceOwnerRef> | null | undefined,
  userId: string | null | undefined,
): number {
  return getOwnedWorkspaces(workspaces, userId).length;
}

/** A conta tem workspace próprio quando é dona de pelo menos um. */
export function hasOwnWorkspace(
  workspaces: ReadonlyArray<WorkspaceOwnerRef> | null | undefined,
  userId: string | null | undefined,
): boolean {
  return countOwnedWorkspaces(workspaces, userId) > 0;
}

/**
 * Workspace a indicar numa compra de plano: só quando quem compra é o dono.
 * Qualquer outro membro (incluindo administradores) compra para a própria conta.
 */
export function getCheckoutWorkspaceId(
  workspace: (WorkspaceOwnerRef & { id: string }) | null | undefined,
  userId: string | null | undefined,
): string | undefined {
  return workspace && isWorkspaceOwner(workspace, userId) ? workspace.id : undefined;
}

export const CONTACT_OWNER_MESSAGE = 'Contacte o dono deste workspace para alterar o plano';
export const MANUAL_PLAN_MESSAGE = 'O seu plano é gerido pela equipa WillFlow';
export const LEAVING_PAGE_WARNING =
  'Vai sair desta página para concluir o pagamento; o que estiver por guardar perde-se.';

/**
 * Plano atribuído manualmente: conta ativa sem subscrição Stripe. Não há portal
 * de faturação para abrir. Só é afirmado quando se SABE que não há subscrição
 * (`hasStripeSubscription === false`); desconhecido não conta como manual.
 */
export function isManuallyGrantedPlan(account: {
  status: string | null | undefined;
  hasStripeSubscription: boolean | null | undefined;
}): boolean {
  return account.status === 'active' && account.hasStripeSubscription === false;
}

export type OnboardingOffer = 'trial' | 'account_plan' | 'trial_used';

export interface OnboardingOfferInput {
  /** Estado da conta (`user_subscriptions.subscription_status`). */
  accountStatus: string | null | undefined;
  trialStartedAt: string | null | undefined;
  trialEndsAt: string | null | undefined;
  /** A conta já é dona de um workspace e está a criar outro. */
  addingToOwnWorkspaces: boolean;
}

/**
 * O que o onboarding mostra antes de criar o workspace. Função pura; o servidor
 * continua a ser a autoridade.
 * - plano ativo: o workspace usa o plano da conta;
 * - teste já usado (começou e já terminou) sem plano ativo: explicação e planos,
 *   nunca a promessa de 7 dias grátis;
 * - conta que já é dona de um workspace: usa o plano ou o teste em curso;
 * - caso contrário: oferta do teste gratuito.
 */
export function getOnboardingOffer(input: OnboardingOfferInput, now: number = Date.now()): OnboardingOffer {
  if (hasActivePaidPlan(input.accountStatus)) return 'account_plan';

  if (input.trialStartedAt) {
    const end = input.trialEndsAt ? Date.parse(input.trialEndsAt) : NaN;
    if (Number.isFinite(end) && end <= now) return 'trial_used';
  }

  return input.addingToOwnWorkspaces ? 'account_plan' : 'trial';
}

export const TRIAL_USED_MESSAGE =
  'O período de teste desta conta já foi usado. Para criar um workspace, escolha um plano.';

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
