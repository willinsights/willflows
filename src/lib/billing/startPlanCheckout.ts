import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Ponto único de compra de plano e de abertura do portal de faturação.
 *
 * O plano pertence à conta. Sem `workspaceId` a compra é feita para a conta;
 * com `workspaceId` o servidor exige que quem compra seja o dono desse
 * workspace (o primeiro administrador). O servidor é a autoridade: aqui só se classifica a resposta.
 */

export type CheckoutFailure =
  | 'already_subscribed'
  | 'payment_pending'
  | 'email_not_confirmed'
  | 'forbidden'
  | 'not_workspace_owner'
  | 'error';

export type CheckoutOutcome = 'redirected' | CheckoutFailure;

export interface CheckoutResult {
  status: CheckoutOutcome;
  /** Mensagem pronta a mostrar (ausente quando `redirected`). */
  message?: string;
}

export type PortalOutcome = 'redirected' | 'email_not_confirmed' | 'error';

export interface PortalResult {
  status: PortalOutcome;
  message?: string;
}

export interface StartPlanCheckoutParams {
  priceId: string | null | undefined;
  workspaceId?: string | null;
}

export const ALREADY_SUBSCRIBED_CODE = 'ALREADY_SUBSCRIBED';
/** Recusa 409 quando a única subscrição de plano que bloqueia está `incomplete` no Stripe. */
export const PAYMENT_PENDING_CODE = 'PAYMENT_PENDING';
export const EMAIL_NOT_CONFIRMED_CODE = 'EMAIL_NOT_CONFIRMED';
export const FORBIDDEN_CODE = 'FORBIDDEN';
export const NOT_WORKSPACE_OWNER_CODE = 'NOT_WORKSPACE_OWNER';

export const CHECKOUT_MESSAGES: Record<CheckoutFailure, string> = {
  already_subscribed:
    'Esta conta já tem um plano. Para mudar de plano ou atualizar o pagamento, use a gestão de subscrição.',
  payment_pending:
    'Há um pagamento de subscrição pendente. Conclua-o ou aguarde até 24 horas e tente de novo.',
  email_not_confirmed: 'Confirme o seu email antes de subscrever um plano.',
  forbidden: 'Não tem permissão para subscrever um plano para este workspace.',
  not_workspace_owner:
    'Só o dono do workspace pode gerir o plano. Contacte o dono deste workspace para alterar o plano.',
  error: 'Não foi possível iniciar o pagamento. Tente novamente.',
};

export const PORTAL_MESSAGES: Record<Exclude<PortalOutcome, 'redirected'>, string> = {
  email_not_confirmed: 'Confirme o seu email antes de gerir a faturação.',
  error: 'Não foi possível abrir a gestão de subscrição. Tente novamente.',
};

const readText = (body: unknown, key: 'error' | 'code'): string => {
  if (!body || typeof body !== 'object') return '';
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
};

/**
 * Classifica uma recusa de `create-checkout` a partir do estado HTTP e do corpo JSON.
 * Função pura: não lê nem escreve nada.
 */
export function classifyCheckoutFailure(httpStatus: number | null, body: unknown): CheckoutFailure {
  const code = readText(body, 'code');
  const error = readText(body, 'error');

  // Pagamento pendente vem antes da regra geral do 409
  if (code === PAYMENT_PENDING_CODE || error === PAYMENT_PENDING_CODE) {
    return 'payment_pending';
  }
  if (httpStatus === 409 || code === ALREADY_SUBSCRIBED_CODE || error === ALREADY_SUBSCRIBED_CODE) {
    return 'already_subscribed';
  }
  // O código da recusa é a referência; o texto fica como recurso para
  // respostas de versões do servidor que ainda não enviam `code`.
  if (code === NOT_WORKSPACE_OWNER_CODE) return 'not_workspace_owner';
  if (code === EMAIL_NOT_CONFIRMED_CODE) return 'email_not_confirmed';
  if (code === FORBIDDEN_CODE) return 'forbidden';
  if (httpStatus === 403) {
    return /e-?mail/i.test(error) ? 'email_not_confirmed' : 'forbidden';
  }
  return 'error';
}

/** Classifica uma recusa de `customer-portal`. Função pura. */
export function classifyPortalFailure(
  httpStatus: number | null,
  body: unknown,
): Exclude<PortalOutcome, 'redirected'> {
  if (httpStatus === 403 && /e-?mail/i.test(readText(body, 'error'))) return 'email_not_confirmed';
  return 'error';
}

interface FunctionFailure {
  httpStatus: number | null;
  body: unknown;
}

/**
 * Com `supabase.functions.invoke`, uma resposta não-2xx chega como erro cujo
 * `context` é a `Response`; o JSON da recusa está no corpo dessa resposta.
 */
export async function readFunctionFailure(error: unknown): Promise<FunctionFailure> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof context !== 'object') return { httpStatus: null, body: null };

  const response = context as { status?: unknown; json?: () => Promise<unknown>; clone?: () => unknown };
  const httpStatus = typeof response.status === 'number' ? response.status : null;
  let body: unknown = null;
  try {
    const readable = (typeof response.clone === 'function' ? response.clone() : response) as {
      json?: () => Promise<unknown>;
    };
    if (typeof readable.json === 'function') body = await readable.json();
  } catch {
    // recusa sem corpo JSON
  }
  return { httpStatus, body };
}

const redirectTo = (url: string) => {
  globalThis.location.assign(url);
};

const readUrl = (data: unknown): string | null => {
  const url = (data as { url?: unknown } | null)?.url;
  return typeof url === 'string' && url.length > 0 ? url : null;
};

/**
 * Inicia a compra de um plano. Em sucesso redireciona para o pagamento.
 * Nunca lança: devolve sempre um resultado tipado.
 */
export async function startPlanCheckout({
  priceId,
  workspaceId,
}: StartPlanCheckoutParams): Promise<CheckoutResult> {
  if (!priceId) {
    return { status: 'error', message: CHECKOUT_MESSAGES.error };
  }

  try {
    const body: { priceId: string; workspaceId?: string } = { priceId };
    if (workspaceId) body.workspaceId = workspaceId;

    const { data, error } = await supabase.functions.invoke('create-checkout', { body });

    if (error) {
      const failure = await readFunctionFailure(error);
      const status = classifyCheckoutFailure(failure.httpStatus, failure.body);
      logger.warn('[billing] checkout recusado:', status);
      return { status, message: CHECKOUT_MESSAGES[status] };
    }

    const url = readUrl(data);
    if (!url) {
      logger.warn('[billing] checkout sem URL de pagamento');
      return { status: 'error', message: CHECKOUT_MESSAGES.error };
    }

    redirectTo(url);
    return { status: 'redirected' };
  } catch {
    logger.warn('[billing] checkout falhou antes da resposta');
    return { status: 'error', message: CHECKOUT_MESSAGES.error };
  }
}

/**
 * Abre o portal de faturação (mudar de plano, atualizar o pagamento, faturas).
 * Nunca lança: devolve sempre um resultado tipado.
 */
export async function openBillingPortal(): Promise<PortalResult> {
  try {
    const { data, error } = await supabase.functions.invoke('customer-portal');

    if (error) {
      const failure = await readFunctionFailure(error);
      const status = classifyPortalFailure(failure.httpStatus, failure.body);
      logger.warn('[billing] portal recusado:', status);
      return { status, message: PORTAL_MESSAGES[status] };
    }

    const url = readUrl(data);
    if (!url) {
      return { status: 'error', message: PORTAL_MESSAGES.error };
    }

    redirectTo(url);
    return { status: 'redirected' };
  } catch {
    logger.warn('[billing] portal falhou antes da resposta');
    return { status: 'error', message: PORTAL_MESSAGES.error };
  }
}
