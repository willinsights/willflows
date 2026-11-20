import { describe, it, expect, vi } from 'vitest';
import { fetchAllRows } from '../fetch-all';

interface Row {
  id: number;
}

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

/**
 * Simula o PostgREST: `.range(from, to)` devolve as linhas [from, to] (inclusivo)
 * de um conjunto fixo. `range` é um mock para se poder inspecionar as chamadas.
 */
function makeSource(rows: Row[]) {
  const range = vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, to + 1),
    error: null as unknown,
  }));
  const makeQuery = vi.fn(() => ({ range }));
  return { range, makeQuery };
}

describe('fetchAllRows', () => {
  it('devolve todas as 2.500 linhas, em páginas de 1.000, pela ordem recebida', async () => {
    const rows = makeRows(2500);
    const { range, makeQuery } = makeSource(rows);

    const result = await fetchAllRows(makeQuery);

    expect(result).toHaveLength(2500);
    expect(result).toEqual(rows);
    expect(range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('pede uma query nova por página e pára na página incompleta', async () => {
    const { range, makeQuery } = makeSource(makeRows(2500));

    await fetchAllRows(makeQuery);

    // A terceira página traz 500 linhas (< 1.000): não há quarto pedido.
    expect(makeQuery).toHaveBeenCalledTimes(3);
    expect(range).toHaveBeenCalledTimes(3);
  });

  it('faz um pedido extra (vazio) quando o total é múltiplo exato de 1.000', async () => {
    const { range, makeQuery } = makeSource(makeRows(2000));

    const result = await fetchAllRows(makeQuery);

    expect(result).toHaveLength(2000);
    expect(range).toHaveBeenCalledTimes(3);
    expect(range.mock.calls[2]).toEqual([2000, 2999]);
  });

  it('faz um único pedido quando há menos de 1.000 linhas', async () => {
    const { range, makeQuery } = makeSource(makeRows(3));

    const result = await fetchAllRows(makeQuery);

    expect(result).toEqual(makeRows(3));
    expect(range).toHaveBeenCalledTimes(1);
    expect(range).toHaveBeenCalledWith(0, 999);
  });

  it('trata data null como página vazia', async () => {
    const range = vi.fn(async () => ({ data: null as Row[] | null, error: null as unknown }));

    const result = await fetchAllRows(() => ({ range }));

    expect(result).toEqual([]);
    expect(range).toHaveBeenCalledTimes(1);
  });

  it('propaga o erro e não devolve resultados parciais', async () => {
    const rows = makeRows(2500);
    const failure = { message: 'falha simulada', code: 'TEST' };
    const range = vi.fn(async (from: number, to: number) =>
      from === 1000
        ? { data: null as Row[] | null, error: failure as unknown }
        : { data: rows.slice(from, to + 1) as Row[] | null, error: null as unknown },
    );

    await expect(fetchAllRows(() => ({ range }))).rejects.toBe(failure);
    // Parou na página que falhou: não pediu a terceira.
    expect(range).toHaveBeenCalledTimes(2);
  });
});
