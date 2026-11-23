import { describe, expect, it } from 'vitest';
import { fetchAllAsResult, fetchAllRows } from './fetch-all';

// Synthetic workspace (fictitious data): 2.537 projects, above the 1.000-row cap.
type Row = { id: string; agreed_value: number; is_delivered: boolean };
const ROWS: Row[] = Array.from({ length: 2537 }, (_, i) => ({
  id: `p-${String(i).padStart(5, '0')}`,
  agreed_value: (i % 17) * 125 + 50,
  is_delivered: i % 3 === 0,
}));

/** Fake PostgREST: never returns more than 1.000 rows per request. */
function fakeTable(rows: Row[], opts: { failAtOffset?: number } = {}) {
  let requests = 0;
  const builder = {
    range: async (from: number, to: number) => {
      requests++;
      if (opts.failAtOffset !== undefined && from >= opts.failAtOffset) return { data: null, error: new Error('falha simulada') };
      const limit = Math.min(to - from + 1, 1000);
      return { data: rows.slice(from, from + limit), error: null };
    },
  };
  return { make: () => builder, requests: () => requests };
}

describe('B2c — workspace sintético com mais de 1.000 projetos', () => {
  const reference = ROWS.reduce((s, r) => s + (r.is_delivered ? 0 : r.agreed_value), 0);

  it('lê todas as linhas e o total coincide com o cálculo de referência', async () => {
    const t = fakeTable(ROWS);
    const { data, error } = await fetchAllAsResult<Row>(t.make);
    expect(error).toBeNull();
    expect(data).toHaveLength(2537);
    expect(new Set(data!.map((r) => r.id)).size).toBe(2537);
    expect(data!.reduce((s, r) => s + (r.is_delivered ? 0 : r.agreed_value), 0)).toBe(reference);
    expect(t.requests()).toBe(3);
  });

  it('sem paginação o total ficaria cortado (prova do defeito)', async () => {
    const { data } = await fakeTable(ROWS).make().range(0, 99_999);
    expect(data!.length).toBe(1000);
    expect(data!.reduce((s, r) => s + (r.is_delivered ? 0 : r.agreed_value), 0)).not.toBe(reference);
  });

  it('exatamente 1.000 linhas faz um pedido extra e pára', async () => {
    const t = fakeTable(ROWS.slice(0, 1000));
    expect(await fetchAllRows<Row>(t.make)).toHaveLength(1000);
    expect(t.requests()).toBe(2);
  });

  it('erro numa página devolve erro e nenhum total parcial', async () => {
    const { data, error } = await fetchAllAsResult<Row>(fakeTable(ROWS, { failAtOffset: 1000 }).make);
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(Error);
  });
});
