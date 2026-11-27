import { describe, expect, it } from 'vitest';
import { normalizeSearchText, searchTextMatches } from '../search-normalize';

describe('normalizeSearchText', () => {
  it('folds case, accents and separators to plain letters', () => {
    expect(normalizeSearchText('José da Silva')).toBe('josedasilva');
    expect(normalizeSearchText('JOSÉ DA SILVA')).toBe('josedasilva');
    expect(normalizeSearchText("O'Brien.  Smith")).toBe('obriensmith');
    expect(normalizeSearchText('ITSAR-2026-HOT-009')).toBe('itsar2026hot009');
    expect(normalizeSearchText('Hotel 45 seg')).toBe('hotel45seg');
  });

  it('folds every uppercase accented letter the server folds', () => {
    const pairs: Array<[string, string]> = [
      ['ÁÀÂÃÄÅ', 'aaaaaa'],
      ['ÉÈÊË', 'eeee'],
      ['Ç', 'c'],
      ['ÍÌÎÏ', 'iiii'],
      ['Ñ', 'n'],
      ['ÓÒÔÕÖ', 'ooooo'],
      ['ÚÙÛÜ', 'uuuu'],
      ['Ý', 'y'],
    ];
    for (const [input, expected] of pairs) {
      expect(normalizeSearchText(input)).toBe(expected);
    }
  });
});

describe('searchTextMatches', () => {
  it('finds a stored name typed without spaces', () => {
    expect(searchTextMatches('José Silva', 'josesilva')).toBe(true);
    expect(searchTextMatches('Jose Silva', 'jose silva')).toBe(true);
    expect(searchTextMatches('SÃO PAULO HOTEL', 'saopaulo')).toBe(true);
    expect(searchTextMatches('Hotel 45 seg', 'hotel45')).toBe(true);
  });

  it('ignores unrelated text, empty queries and missing values', () => {
    expect(searchTextMatches('José Silva', 'pedro')).toBe(false);
    expect(searchTextMatches('José Silva', '')).toBe(false);
    expect(searchTextMatches(null, 'jose')).toBe(false);
    expect(searchTextMatches(undefined, 'jose')).toBe(false);
  });
});
