import { describe, expect, it, vi } from 'vitest';
import { authenticatePrivateVideo } from '../../supabase/functions/private-video/authentication';

const user = '11111111-1111-4111-8111-111111111111';
const request = (header?: string) => new Request('http://localhost/private-video', {
  headers: header ? { Authorization: header } : {},
});
describe('private video verified identity', () => {
  it('accepts verified authenticated signing-key claims without a session_id', async () => {
    const getClaims = vi.fn().mockResolvedValue({ data: { claims: { sub: user, role: 'authenticated' } }, error: null });
    expect(await authenticatePrivateVideo(request('Bearer fixture'), { getClaims })).toBe(user);
    expect(getClaims).toHaveBeenCalledWith('fixture');
  });
  it('refuses missing and malformed bearer headers without checking identity', async () => {
    const getClaims = vi.fn();
    for (const header of [undefined, 'Basic fixture', 'Bearer one,two']) {
      expect(await authenticatePrivateVideo(request(header), { getClaims })).toBeNull();
    }
    expect(getClaims).not.toHaveBeenCalled();
  });
  it('refuses failed JWT verification even if the result contains a subject', async () => {
    const getClaims = vi.fn().mockResolvedValue({ data: { claims: { sub: user, role: 'authenticated' } }, error: new Error('expired or invalid') });
    expect(await authenticatePrivateVideo(request('Bearer fixture'), { getClaims })).toBeNull();
  });
  it('refuses anonymous and service credentials and malformed subjects', async () => {
    for (const claims of [{ sub: user, role: 'anon' }, { sub: user, role: 'service_role' }, { sub: 'not-a-user', role: 'authenticated' }]) {
      const getClaims = vi.fn().mockResolvedValue({ data: { claims }, error: null });
      expect(await authenticatePrivateVideo(request('Bearer fixture'), { getClaims })).toBeNull();
    }
  });
  it('fails closed if authentication is unavailable', async () => {
    const getClaims = vi.fn().mockRejectedValue(new Error('unavailable'));
    expect(await authenticatePrivateVideo(request('Bearer fixture'), { getClaims })).toBeNull();
  });
});