import { beforeEach, describe, expect, it, vi } from 'vitest';
const st = vi.hoisted(() => ({ from: vi.fn(), cols: [] as any[], fail: false, writes: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: st.from } }));
import { shouldTransferToEditing, transferToEditing } from './transferToEditing';
const W='01000000-0000-4000-8000-000000000001', P='09000000-0000-4000-8000-0000000000a3', CAP='cap-final';
beforeEach(() => {
  st.cols=[]; st.fail=false; st.writes=[];
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('rede proibida'); }));
  st.from.mockImplementation((table: string) => {
    const f: [string, any][] = []; let payload: any;
    const q: any = {
      select: () => q, order: () => q,
      eq: (k: string, v: any) => { f.push([k, v]); return q; },
      limit: async (n: number) => ({ data: st.cols.filter(c => f.every(([k, v]) => c[k] === v)).sort((a, b) => a.position - b.position).slice(0, n).map(c => ({ id: c.id })), error: null }),
      update: (v: any) => { payload = v; st.writes.push({ table, v, f }); return q; },
      maybeSingle: async () => st.fail ? { data: null, error: { message: 'falha simulada' } } : { data: { id: P, ...payload }, error: null },
    };
    return q;
  });
});
describe('regra de conclusão', () => {
  it('Captação + Edição em Captação transfere', () => expect(shouldTransferToEditing('projeto_completo', 'captacao')).toBe(true));
  it('Captação + Edição em Edição entrega', () => expect(shouldTransferToEditing('projeto_completo', 'edicao')).toBe(false));
  it('Só Captação entrega na Captação', () => expect(shouldTransferToEditing('projeto_captacao', 'captacao')).toBe(false));
});
describe('transferência simulada', () => {
  it('vai para a primeira coluna não final, sem campos de entrega', async () => {
    st.cols = [
      { id: 'ed-final', workspace_id: W, phase: 'edicao', is_final: true, position: 0 },
      { id: 'ed-a-iniciar', workspace_id: W, phase: 'edicao', is_final: false, position: 1 },
    ];
    const r = await transferToEditing({ projectId: P, workspaceId: W, captureColumnId: CAP });
    expect(r).toEqual({ ok: true, editingColumnId: 'ed-a-iniciar' });
    expect(st.writes).toHaveLength(1);
    expect(st.writes[0].v).not.toHaveProperty('is_delivered');
    expect(st.writes[0].v).not.toHaveProperty('delivered_at');
    expect(st.writes[0].v.current_phase).toBe('edicao');
  });
  it('sem coluna elegível não grava', async () => {
    st.cols = [{ id: 'ed-final', workspace_id: W, phase: 'edicao', is_final: true, position: 0 }];
    expect(await transferToEditing({ projectId: P, workspaceId: W, captureColumnId: CAP })).toEqual({ ok: false, reason: 'no_column' });
    expect(st.writes).toHaveLength(0);
  });
  it('falha de gravação não é sucesso', async () => {
    st.cols = [{ id: 'ed-a-iniciar', workspace_id: W, phase: 'edicao', is_final: false, position: 0 }];
    st.fail = true;
    const r = await transferToEditing({ projectId: P, workspaceId: W, captureColumnId: CAP });
    expect(r.ok).toBe(false);
    expect((r as any).reason).toBe('write_error');
  });
});
