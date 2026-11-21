import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hasPortalReturnParam,
  isReturningFromPortal,
  removePortalReturnParam,
} from '../portalReturn';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('hasPortalReturnParam', () => {
  it('deteta portal=return com ou sem «?»', () => {
    expect(hasPortalReturnParam('?portal=return')).toBe(true);
    expect(hasPortalReturnParam('portal=return')).toBe(true);
    expect(hasPortalReturnParam('?tab=x&portal=return')).toBe(true);
  });

  it('ignora outros valores e ausência', () => {
    expect(hasPortalReturnParam('')).toBe(false);
    expect(hasPortalReturnParam(null)).toBe(false);
    expect(hasPortalReturnParam(undefined)).toBe(false);
    expect(hasPortalReturnParam('?portal=outro')).toBe(false);
    expect(hasPortalReturnParam('?return=portal')).toBe(false);
  });
});

describe('removePortalReturnParam', () => {
  it('retira só portal=return e mantém o resto', () => {
    expect(removePortalReturnParam('?portal=return')).toBe('');
    expect(removePortalReturnParam('?tab=x&portal=return')).toBe('?tab=x');
    expect(removePortalReturnParam('?portal=outro')).toBe('?portal=outro');
    expect(removePortalReturnParam('')).toBe('');
  });
});

describe('isReturningFromPortal', () => {
  it('lê a query string atual', () => {
    vi.stubGlobal('location', { search: '?portal=return' });
    expect(isReturningFromPortal()).toBe(true);
    vi.stubGlobal('location', { search: '' });
    expect(isReturningFromPortal()).toBe(false);
  });
});
