import { vi, beforeEach, it, expect } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
const st = vi.hoisted(() => ({ change: undefined as undefined | ((v: string) => Promise<void>), props: {} as any, resolve: undefined as any, error: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: st.error } }));
vi.mock('@/components/ui/select', () => ({
  Select: (props: any) => { st.change=props.onValueChange; st.props=props; return props.children; },
  SelectContent: ({ children }: any) => children, SelectItem: ({ children }: any) => children,
  SelectTrigger: ({ children }: any) => children, SelectValue: ({ children }: any) => children,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => { const q: any = { update: () => q, eq: () => q, select: () => q, maybeSingle: () => new Promise(resolve => { st.resolve=resolve; }) }; return q; } } }));
import { CompetenceMonthSelect } from '../CompetenceMonthSelect';
beforeEach(() => { cleanup(); vi.clearAllMocks(); vi.stubGlobal('fetch', vi.fn(() => { throw new Error('rede proibida'); })); });
it('só muda competência após confirmação da gravação', async () => {
  render(<CompetenceMonthSelect projectId="ficticio" currentValue="2026-10" deliveredAt={null} />);
  let pending: Promise<void> | undefined;
  act(() => { pending=st.change?.('2026-11'); });
  expect(st.props.value).toBe('2026-10'); expect(st.props.disabled).toBe(true);
  await act(async () => { st.resolve({ data: { competence_month: '2026-11' }, error: null }); await pending; });
  expect(st.props.value).toBe('2026-11'); expect(st.props.disabled).toBe(false);
});
it('falha mantém competência anterior e sinaliza erro', async () => {
  render(<CompetenceMonthSelect projectId="ficticio" currentValue="2026-10" deliveredAt={null} />);
  let pending: Promise<void> | undefined;
  act(() => { pending=st.change?.('2026-11'); });
  await act(async () => { st.resolve({ data: null, error: { message: 'Mês fechado' } }); await pending; });
  expect(st.props.value).toBe('2026-10'); expect(st.error).toHaveBeenCalledTimes(1);
});
