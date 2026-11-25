import { describe, expect, it } from 'vitest';
import { createUrlRenewalGuard, isExpiringStorageUrl } from './urlRenewal';

const signed = 'https://demo.supabase.co/storage/v1/object/sign/video-versions/ws-demo/v1.mp4?token=abc';

describe('S19 renovação automática', () => {
  it('renova uma só vez por link', () => {
    const g = createUrlRenewalGuard();
    expect(g.shouldRenew(signed)).toBe(true);
    expect(g.shouldRenew(signed)).toBe(false);
    expect(g.shouldRenew(signed.replace('abc', 'def'))).toBe(false);
    expect(g.shouldRenew(null)).toBe(false);
  });
  it('só os links assinados do Storage expiram', () => {
    expect(isExpiringStorageUrl(signed)).toBe(true);
    expect(isExpiringStorageUrl('https://videodelivery.net/uid-demo/manifest/video.m3u8')).toBe(false);
    expect(isExpiringStorageUrl(undefined)).toBe(false);
  });
});
