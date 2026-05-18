import { describe, it, expect, vi, afterEach } from 'vitest';
import { isOwnEcho } from '../echoSuppression';
import { LOCAL_ECHO_TTL_MS } from '../types';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

describe('isOwnEcho — anti-eco do Kanban (C-3)', () => {
  afterEach(() => vi.useRealTimers());

  describe('updated_by (sinal primário)', () => {
    it('suprime quando newData.updated_by === userId', () => {
      const pending = new Map<string, number>();
      expect(
        isOwnEcho({
          newData: { updated_by: USER_ID },
          oldData: { updated_by: USER_ID },
          recordId: 'rec-1',
          userId: USER_ID,
          pending,
        }),
      ).toBe(true);
    });

    it('não suprime quando updated_by é outro utilizador', () => {
      const pending = new Map<string, number>();
      expect(
        isOwnEcho({
          newData: { updated_by: OTHER_USER_ID },
          oldData: { updated_by: OTHER_USER_ID },
          recordId: 'rec-1',
          userId: USER_ID,
          pending,
        }),
      ).toBe(false);
    });

    it('usa oldData.updated_by quando newData não tem (eventos DELETE)', () => {
      const pending = new Map<string, number>();
      expect(
        isOwnEcho({
          newData: undefined,
          oldData: { updated_by: USER_ID },
          recordId: 'rec-1',
          userId: USER_ID,
          pending,
        }),
      ).toBe(true);
    });

    it('não suprime quando userId está ausente', () => {
      const pending = new Map<string, number>();
      expect(
        isOwnEcho({
          newData: { updated_by: USER_ID },
          oldData: { updated_by: USER_ID },
          recordId: 'rec-1',
          userId: null,
          pending,
        }),
      ).toBe(false);
    });
  });

  describe('TTL fallback (markLocalUpdate)', () => {
    it('suprime quando recordId está em pending e dentro da TTL', () => {
      const pending = new Map<string, number>([['rec-2', 1000]]);
      expect(
        isOwnEcho({
          newData: { updated_by: null },
          oldData: { updated_by: null },
          recordId: 'rec-2',
          userId: USER_ID,
          pending,
          now: 1000 + LOCAL_ECHO_TTL_MS - 100,
        }),
      ).toBe(true);
    });

    it('não suprime quando TTL expirou', () => {
      const pending = new Map<string, number>([['rec-3', 1000]]);
      expect(
        isOwnEcho({
          newData: { updated_by: null },
          oldData: { updated_by: null },
          recordId: 'rec-3',
          userId: USER_ID,
          pending,
          now: 1000 + LOCAL_ECHO_TTL_MS + 1,
        }),
      ).toBe(false);
      // Limpa entrada expirada para evitar leak
      expect(pending.has('rec-3')).toBe(false);
    });

    it('não suprime quando recordId não está em pending', () => {
      const pending = new Map<string, number>();
      expect(
        isOwnEcho({
          newData: { updated_by: null },
          oldData: { updated_by: null },
          recordId: 'rec-x',
          userId: USER_ID,
          pending,
        }),
      ).toBe(false);
    });
  });

  describe('combinação dos dois sinais', () => {
    it('updated_by tem prioridade sobre TTL (suprime mesmo sem entrada em pending)', () => {
      const pending = new Map<string, number>();
      expect(
        isOwnEcho({
          newData: { updated_by: USER_ID },
          oldData: { updated_by: USER_ID },
          recordId: 'rec-4',
          userId: USER_ID,
          pending,
        }),
      ).toBe(true);
    });

    it('TTL ativa quando updated_by não corresponde (ex.: write feito por edge function)', () => {
      const pending = new Map<string, number>([['rec-5', Date.now()]]);
      expect(
        isOwnEcho({
          newData: { updated_by: null },
          oldData: { updated_by: null },
          recordId: 'rec-5',
          userId: USER_ID,
          pending,
        }),
      ).toBe(true);
    });

    it('não suprime quando ambos os sinais falham', () => {
      const pending = new Map<string, number>();
      expect(
        isOwnEcho({
          newData: { updated_by: OTHER_USER_ID },
          oldData: { updated_by: OTHER_USER_ID },
          recordId: 'rec-6',
          userId: USER_ID,
          pending,
        }),
      ).toBe(false);
    });
  });

  describe('casos limite', () => {
    it('lida com newData e oldData ausentes', () => {
      const pending = new Map<string, number>();
      expect(
        isOwnEcho({
          newData: undefined,
          oldData: undefined,
          recordId: undefined,
          userId: USER_ID,
          pending,
        }),
      ).toBe(false);
    });

    it('lida com recordId ausente (não consulta pending)', () => {
      const pending = new Map<string, number>([['rec-7', Date.now()]]);
      expect(
        isOwnEcho({
          newData: { updated_by: OTHER_USER_ID },
          oldData: { updated_by: OTHER_USER_ID },
          recordId: undefined,
          userId: USER_ID,
          pending,
        }),
      ).toBe(false);
    });
  });
});
