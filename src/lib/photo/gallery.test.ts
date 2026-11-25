import { describe, it, expect } from 'vitest';
import { computeExtras, isGalleryLinkExpired, toPercentPoint } from './gallery';

describe('photo gallery rules', () => {
  it('favorites within the included count have no extras', () => {
    expect(computeExtras(30, 30, 15)).toEqual({ favorites: 30, included: 30, extras: 0, amount: 0 });
  });
  it('5 extras at 15 € cost 75 €', () => {
    expect(computeExtras(35, 30, 15).amount).toBe(75);
    expect(computeExtras(35, 30, 15).extras).toBe(5);
  });
  it('no included limit means no extras', () => {
    expect(computeExtras(100, 0, 15).extras).toBe(0);
  });
  it('expired link is detected, missing expiry never expires', () => {
    const now = new Date('2026-11-25T12:00:00Z');
    expect(isGalleryLinkExpired('2026-11-25T11:59:00Z', now)).toBe(true);
    expect(isGalleryLinkExpired('2026-11-26T00:00:00Z', now)).toBe(false);
    expect(isGalleryLinkExpired(null, now)).toBe(false);
  });
  it('clicks are clamped into the photo', () => {
    expect(toPercentPoint(150, 50, { left: 100, top: 0, width: 100, height: 100 })).toEqual({ x: 50, y: 50 });
    expect(toPercentPoint(500, -10, { left: 100, top: 0, width: 100, height: 100 })).toEqual({ x: 100, y: 0 });
  });
});
