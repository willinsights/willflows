import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { offerValidUntil } from './offerValidity';

describe('offerValidUntil', () => {
  it('termina a 31/12 do ano seguinte', () => {
    expect(offerValidUntil(new Date('2026-11-23T00:00:00Z'))).toBe('2027-12-31');
    expect(offerValidUntil(new Date('2027-12-31T23:59:59Z'))).toBe('2028-12-31');
  });
  it('nunca está expirada', () => {
    const now = new Date();
    expect(Date.parse(offerValidUntil(now))).toBeGreaterThan(now.getTime());
  });
  it('nenhuma página tem priceValidUntil fixo', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
    });
    const fixed = walk('src/pages').filter((p) => /"priceValidUntil":\s*"\d{4}-/.test(readFileSync(p, 'utf8')));
    expect(fixed).toEqual([]);
  });
});
