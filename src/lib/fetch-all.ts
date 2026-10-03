/**
 * fetchAllRows — paginates a Supabase query in 1000-row chunks so results
 * are never silently cut at PostgREST's default 1000-row limit.
 *
 * Usage:
 *   const data = await fetchAllRows(() =>
 *     supabase.from('projects').select('*').eq('workspace_id', id)
 *   );
 *
 * The factory must return a fresh query builder on each call (filters included);
 * this helper only appends .range().
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 50; // safety cap: 50k rows

export async function fetchAllRows<T>(
  makeQuery: () => {
    range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
  }
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}
