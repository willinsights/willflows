import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: state.invoke } } }));

import {
  CHECKOUT_MESSAGES,
  classifyCheckoutFailure,
  classifyPortalFailure,
  openBillingPortal,
  readFunctionFailure,
  startPlanCheckout,
} from '../startPlanCheckout';

const httpFailure = (status: number, body: unknown) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
});

const assign = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('location', { assign });
});

describe('classifyCheckoutFailure', () => {
  it('reconhece a conta que já tem plano pelo estado 409 ou pelo código', () => {
    expect(classifyCheckoutFailure(409, { error: 'ALREADY_SUBSCRIBED', code: 'ALREADY_SUBSCRIBED' })).toBe('already_subscribed');
    expect(classifyCheckoutFailure(409, null)).toBe('already_subscribed');
    expect(classifyCheckoutFailure(null, { code: 'ALREADY_SUBSCRIBED' })).toBe('already_subscribed');
  });

  it('distingue email por confirmar de falta de permissão no 403', () => {
    expect(classifyCheckoutFailure(403, { error: 'Confirme o seu email antes de subscrever um plano.' })).toBe('email_not_confirmed');
    expect(classifyCheckoutFailure(403, { error: 'Não tem permissão para subscrever este workspace.' })).toBe('forbidden');
    expect(classifyCheckoutFailure(403, null)).toBe('forbidden');
  });

  it('classifica os 403 pelo código quando o servidor o envia', () => {
    expect(
      classifyCheckoutFailure(403, { error: 'Só o dono do workspace pode gerir o plano', code: 'NOT_WORKSPACE_OWNER' }),
    ).toBe('not_workspace_owner');
    expect(classifyCheckoutFailure(403, { error: 'qualquer texto', code: 'EMAIL_NOT_CONFIRMED' })).toBe('email_not_confirmed');
    // O código prevalece sobre o texto: «email» no texto não engana o classificador
    expect(classifyCheckoutFailure(403, { error: 'Confirme o seu email', code: 'FORBIDDEN' })).toBe('forbidden');
    expect(classifyCheckoutFailure(403, { error: 'Confirme o seu email', code: 'NOT_WORKSPACE_OWNER' })).toBe('not_workspace_owner');
  });

  it('código desconhecido no 403 recorre ao texto', () => {
    expect(classifyCheckoutFailure(403, { error: 'Confirme o seu email.', code: 'OUTRO' })).toBe('email_not_confirmed');
    expect(classifyCheckoutFailure(403, { error: 'Sem permissão.', code: 'OUTRO' })).toBe('forbidden');
  });

  it('tem mensagem própria para o administrador que não é dono', () => {
    expect(CHECKOUT_MESSAGES.not_workspace_owner).toContain('Só o dono do workspace pode gerir o plano');
    expect(CHECKOUT_MESSAGES.not_workspace_owner).not.toBe(CHECKOUT_MESSAGES.forbidden);
  });

  it('trata o resto como erro genérico', () => {
    expect(classifyCheckoutFailure(500, { error: 'falha' })).toBe('error');
    expect(classifyCheckoutFailure(400, { error: 'Plano inválido.' })).toBe('error');
    expect(classifyCheckoutFailure(null, null)).toBe('error');
    expect(classifyCheckoutFailure(500, 'texto')).toBe('error');
  });
});

describe('classifyPortalFailure', () => {
  it('reconhece email por confirmar e trata o resto como erro', () => {
    expect(classifyPortalFailure(403, { error: 'Confirme o seu email antes de gerir a faturação.' })).toBe('email_not_confirmed');
    expect(classifyPortalFailure(403, null)).toBe('error');
    expect(classifyPortalFailure(500, { error: 'falha' })).toBe('error');
  });
});

describe('readFunctionFailure', () => {
  it('lê o estado e o corpo JSON da resposta', async () => {
    await expect(readFunctionFailure(httpFailure(409, { code: 'ALREADY_SUBSCRIBED' }))).resolves.toEqual({
      httpStatus: 409,
      body: { code: 'ALREADY_SUBSCRIBED' },
    });
  });

  it('aguenta erros sem resposta ou sem JSON', async () => {
    await expect(readFunctionFailure(new Error('rede'))).resolves.toEqual({ httpStatus: null, body: null });
    await expect(
      readFunctionFailure({ context: new Response('não é json', { status: 502 }) }),
    ).resolves.toEqual({ httpStatus: 502, body: null });
  });
});

describe('startPlanCheckout', () => {
  it('compra para a conta sem enviar workspaceId e redireciona', async () => {
    state.invoke.mockResolvedValue({ data: { url: 'https://pagamento.example/sessao' }, error: null });
    const result = await startPlanCheckout({ priceId: 'price_sintetico' });
    expect(state.invoke).toHaveBeenCalledWith('create-checkout', { body: { priceId: 'price_sintetico' } });
    expect(assign).toHaveBeenCalledWith('https://pagamento.example/sessao');
    expect(result).toEqual({ status: 'redirected' });
  });

  it('envia workspaceId quando é indicado', async () => {
    state.invoke.mockResolvedValue({ data: { url: 'https://pagamento.example/sessao' }, error: null });
    await startPlanCheckout({ priceId: 'price_sintetico', workspaceId: 'ws-sintetico' });
    expect(state.invoke).toHaveBeenCalledWith('create-checkout', {
      body: { priceId: 'price_sintetico', workspaceId: 'ws-sintetico' },
    });
  });

  it('devolve already_subscribed com a mensagem clara, nunca o erro genérico', async () => {
    state.invoke.mockResolvedValue({
      data: null,
      error: httpFailure(409, { error: 'ALREADY_SUBSCRIBED', code: 'ALREADY_SUBSCRIBED' }),
    });
    const result = await startPlanCheckout({ priceId: 'price_sintetico' });
    expect(result).toEqual({ status: 'already_subscribed', message: CHECKOUT_MESSAGES.already_subscribed });
    expect(result.message).not.toContain('non-2xx');
    expect(assign).not.toHaveBeenCalled();
  });

  it('classifica as recusas 403', async () => {
    state.invoke.mockResolvedValue({ data: null, error: httpFailure(403, { error: 'Confirme o seu email antes de subscrever um plano.' }) });
    expect((await startPlanCheckout({ priceId: 'p' })).status).toBe('email_not_confirmed');
    state.invoke.mockResolvedValue({ data: null, error: httpFailure(403, { error: 'Não tem permissão para subscrever este workspace.' }) });
    expect((await startPlanCheckout({ priceId: 'p', workspaceId: 'ws' })).status).toBe('forbidden');
  });

  it('devolve erro sem preço, sem URL ou quando a chamada rebenta', async () => {
    expect((await startPlanCheckout({ priceId: null })).status).toBe('error');
    expect(state.invoke).not.toHaveBeenCalled();

    state.invoke.mockResolvedValue({ data: {}, error: null });
    expect((await startPlanCheckout({ priceId: 'p' })).status).toBe('error');

    state.invoke.mockRejectedValue(new Error('rede'));
    expect(await startPlanCheckout({ priceId: 'p' })).toEqual({ status: 'error', message: CHECKOUT_MESSAGES.error });
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('openBillingPortal', () => {
  it('redireciona para o portal', async () => {
    state.invoke.mockResolvedValue({ data: { url: 'https://portal.example/sessao' }, error: null });
    expect(await openBillingPortal()).toEqual({ status: 'redirected' });
    expect(state.invoke).toHaveBeenCalledWith('customer-portal');
    expect(assign).toHaveBeenCalledWith('https://portal.example/sessao');
  });

  it('devolve erro tipado quando o servidor recusa', async () => {
    state.invoke.mockResolvedValue({ data: null, error: httpFailure(500, { error: 'falha' }) });
    expect((await openBillingPortal()).status).toBe('error');
    state.invoke.mockResolvedValue({ data: null, error: httpFailure(403, { error: 'Confirme o seu email antes de gerir a faturação.' }) });
    expect((await openBillingPortal()).status).toBe('email_not_confirmed');
    expect(assign).not.toHaveBeenCalled();
  });
});
