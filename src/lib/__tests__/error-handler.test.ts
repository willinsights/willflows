import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import {
  WORKSPACE_INACTIVE_MESSAGE,
  getSafeErrorMessage,
  getWriteErrorMessage,
  handleDatabaseError,
  isWorkspaceInactiveError,
} from '../error-handler';

const serverError = {
  code: '23514',
  message: 'A subscrição deste workspace expirou. Faça upgrade do plano para continuar a criar registos.',
};

describe('workspace sem plano ativo', () => {
  it('reconhece o bloqueio do servidor, com ou sem código', () => {
    expect(isWorkspaceInactiveError(serverError)).toBe(true);
    expect(isWorkspaceInactiveError({ message: serverError.message })).toBe(true);
    expect(isWorkspaceInactiveError(new Error(serverError.message))).toBe(true);
  });

  it('não confunde outras violações de 23514 nem valores vazios', () => {
    expect(isWorkspaceInactiveError({ code: '23514', message: 'new row violates check constraint' })).toBe(false);
    for (const value of [null, undefined, 'texto', 42]) {
      expect(isWorkspaceInactiveError(value)).toBe(false);
    }
  });

  it('getSafeErrorMessage e handleDatabaseError dão a mensagem própria em vez da genérica de 23514', () => {
    expect(getSafeErrorMessage(serverError)).toEqual({ message: WORKSPACE_INACTIVE_MESSAGE, isAuthError: false });
    expect(handleDatabaseError('createProject', serverError)).toBe(WORKSPACE_INACTIVE_MESSAGE);
    expect(getSafeErrorMessage({ code: '23514', message: 'outra' }).message).toBe('Os dados fornecidos são inválidos.');
  });

  it('getWriteErrorMessage mantém a mensagem original ou o texto de recurso nos outros casos', () => {
    expect(getWriteErrorMessage(serverError, 'x')).toBe(WORKSPACE_INACTIVE_MESSAGE);
    expect(getWriteErrorMessage(new Error('Falhou'), 'x')).toBe('Falhou');
    expect(getWriteErrorMessage({ message: '  ' }, 'Recurso')).toBe('Recurso');
    expect(getWriteErrorMessage(null, 'Recurso')).toBe('Recurso');
  });
});
