import { describe, expect, it } from 'vitest';
import {
  resolveVerifiedTestRecipient,
  type TestRecipientResult,
  type TestRecipientUser,
} from '../../supabase/functions/_shared/test-recipient.ts';

const verifiedUser: TestRecipientUser = {
  id: 'u-1',
  email: 'Geral@WillFlow.app',
  email_confirmed_at: '2026-01-05T10:00:00Z',
};

// The app builds with strictNullChecks off, which collapses the union's
// discriminant, so the rejection fields are read through this view.
const rejection = (result: TestRecipientResult) =>
  result as unknown as { ok: boolean; status?: number; error?: string };

describe("test-email recipients stay on the caller's verified address", () => {
  it('sends to the signed-in verified address when the UI repeats it', () => {
    const result = resolveVerifiedTestRecipient(verifiedUser, 'geral@willflow.app');
    expect(result).toEqual({ ok: true, email: 'geral@willflow.app' });
  });

  it('sends to the verified address when the UI sends nothing', () => {
    const result = resolveVerifiedTestRecipient(verifiedUser, undefined);
    expect(result).toEqual({ ok: true, email: 'geral@willflow.app' });
  });

  it('refuses a different address', () => {
    const result = rejection(resolveVerifiedTestRecipient(verifiedUser, 'alguem@exemplo.com'));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toContain('email verificado');
  });

  it('refuses an unverified account even for its own address', () => {
    const result = rejection(
      resolveVerifiedTestRecipient(
        { id: 'u-2', email: 'x@exemplo.com', email_confirmed_at: null },
        'x@exemplo.com',
      ),
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  it('refuses a verified account whose stored address is unusable', () => {
    const result = rejection(
      resolveVerifiedTestRecipient(
        { id: 'u-3', email: null, email_confirmed_at: '2026-01-05T10:00:00Z' },
        undefined,
      ),
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });
});
