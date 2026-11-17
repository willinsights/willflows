import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useVideoVersions } from '../useVideoVersions';
const { invoke, toast } = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke }, from: () => ({ select: () => ({ eq: () => ({ order: () => ({ eq: async () => ({ data: [], error: null }) }) }) }) }) } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('../useWorkspaceStorage', () => ({ useWorkspaceStorage: () => ({ storage: { canUpload: () => true }, addStorageUsed: vi.fn(), removeStorageUsed: vi.fn() }) }));
beforeEach(() => vi.clearAllMocks());
it('does not upload bytes when issuance omitted the required ticket', async () => {
 invoke.mockResolvedValue({ data: { uploadUrl: 'https://fixture.invalid', key: 'fixture' }, error: null });
 const { result } = renderHook(() => useVideoVersions('task', 'workspace', 'project'));
 await waitFor(() => expect(result.current.loading).toBe(false));
 await act(async () => { await expect(result.current.uploadVersion({ file: new File(['fixture'], 'corte.mp4'), taskId: 'task', workspaceId: 'workspace', projectId: 'project' })).rejects.toThrow(); });
 expect(invoke).toHaveBeenCalledTimes(1);
 expect(invoke.mock.calls[0][0]).toBe('r2-upload-url');
 expect(result.current.uploading).toBe(false);
});
