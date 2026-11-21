/**
 * Regresso do portal de faturação do Stripe.
 *
 * A função `customer-portal` define o `return_url` como `/app/conta?portal=return`.
 * Ao detetar este parâmetro a app ignora a cache local do workspace (que podia
 * ainda ter o plano anterior à mudança feita no portal) e lê o plano do servidor.
 * O parâmetro é depois retirado do URL para não voltar a forçar a leitura.
 * Funções puras: não leem nem escrevem nada.
 */

export const PORTAL_RETURN_PARAM = 'portal';
export const PORTAL_RETURN_VALUE = 'return';

const toParams = (search: string | null | undefined): URLSearchParams =>
  new URLSearchParams(search ?? '');

/** True quando a query string traz `portal=return`. */
export function hasPortalReturnParam(search: string | null | undefined): boolean {
  return toParams(search).get(PORTAL_RETURN_PARAM) === PORTAL_RETURN_VALUE;
}

/**
 * Query string sem `portal=return` (com `?` inicial, ou vazia). Os restantes
 * parâmetros mantêm-se. Outros valores de `portal` não são tocados.
 */
export function removePortalReturnParam(search: string | null | undefined): string {
  const params = toParams(search);
  if (params.get(PORTAL_RETURN_PARAM) === PORTAL_RETURN_VALUE) {
    params.delete(PORTAL_RETURN_PARAM);
  }
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

/** Lê a query string atual do browser sem falhar fora dele. */
export function isReturningFromPortal(): boolean {
  try {
    return hasPortalReturnParam(globalThis.location?.search);
  } catch {
    return false;
  }
}
