import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
const st = vi.hoisted(() => ({ from: vi.fn(), toast: vi.fn(), column: true, inserts: [] as any[], filters: [] as any[] }));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ currentWorkspace: { id: 'fake-workspace' }, fetchError: null }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fake-user' } }) }));
vi.mock('@/hooks/useFinancialPermissions', () => ({ useFinancialPermissions: () => ({ canViewAllProjects: true, isLoading: true }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: st.toast }) }));
vi.mock('@/lib/error-handler', () => ({ handleDatabaseError: () => 'erro simulado' }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/validation-schemas', () => ({ projectSchema: {}, projectUpdateSchema: {}, validateWithSchema: (_: unknown, data: unknown) => ({ success: true, data }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: st.from } }));
import { useProjects } from '../useProjects';
beforeEach(() => {
  vi.clearAllMocks(); st.column = true; st.inserts = []; st.filters = [];
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('rede proibida'); }));
  st.from.mockImplementation((table: string) => {
    let payload: any; const filters: any[] = []; st.filters.push({ table, filters });
    const q: any = {
      select: () => q, eq: (k: string, v: unknown) => { filters.push([k,v]); return q; }, order: () => q, limit: () => q,
      insert: (data: any) => { payload=data; st.inserts.push({ table, data }); return q; },
      single: async () => ({ data: table === 'kanban_columns' ? (st.column ? { id: 'nonfinal' } : null) : payload ? { id: 'new', ...payload } : { id: 'original', name: 'Fictício', item_type: 'projeto_completo', is_delivered: true }, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    }; return q;
  });
});
describe('useProjects', () => {
  it('expõe estado e operações existentes', () => {
    const { result } = renderHook(useProjects);
    expect(result.current.projects).toEqual([]);
    expect(typeof result.current.loading).toBe('boolean');
    for (const key of ['createProject','updateProject','deleteProject','duplicateProject','refresh'] as const) expect(typeof result.current[key]).toBe('function');
  });
  it.each(['createProject','duplicateProject'] as const)('%s usa coluna não final', async (operation) => {
    const { result } = renderHook(useProjects);
    await act(async () => { if (operation === 'createProject') await result.current.createProject({ name: 'Fictício', type: 'video' }); else await result.current.duplicateProject('original'); });
    expect(st.filters.find(x => x.table === 'kanban_columns').filters).toContainEqual(['is_final', false]);
    expect(st.inserts[0].data.captacao_column_id).toBe('nonfinal');
    if (operation === 'duplicateProject') expect(st.inserts[0].data.is_delivered).toBe(false);
  });
  it.each(['createProject','duplicateProject'] as const)('%s sem coluna não insere projeto', async (operation) => {
    st.column=false; const { result } = renderHook(useProjects);
    let value: unknown;
    await act(async () => { value = operation === 'createProject' ? await result.current.createProject({ name: 'Fictício', type: 'video' }) : await result.current.duplicateProject('original'); });
    expect(value).toBeNull(); expect(st.inserts).toHaveLength(0); expect(st.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
