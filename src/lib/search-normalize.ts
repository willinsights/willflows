// Mirrors public.normalize_search_text() in the database so a term and a stored
// value fold the same way on both sides of a search: accents folded to plain
// letters, separators (spaces, dots, hyphens...) dropped, everything lowercased.
const EXTRA_FOLDS: Record<string, string> = {
  ø: 'o',
  æ: 'a',
  œ: 'o',
  đ: 'd',
  ł: 'l',
  ħ: 'h',
  ŧ: 't',
  ı: 'i',
  ß: 's',
};

const EXTRA_FOLD_RE = /[øæœđłħŧıß]/g;

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(EXTRA_FOLD_RE, (char) => EXTRA_FOLDS[char] ?? char)
    .replace(/[^a-z0-9]/g, '');
}

/**
 * True when `query` (as typed) matches `value` (as stored) once spaces, accents
 * and punctuation are ignored: "josesilva" matches "José Silva".
 */
export function searchTextMatches(value: string | null | undefined, query: string): boolean {
  if (!value) return false;
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  return normalizeSearchText(value).includes(normalizedQuery);
}
