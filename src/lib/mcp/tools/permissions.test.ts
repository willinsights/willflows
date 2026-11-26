import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ToolContext } from '@lovable.dev/mcp-js';
import { requireWorkspaceAccess, supabaseForUser } from '../supabase';
import listProjects from './list-projects';

vi.mock('../supabase', () => ({ supabaseForUser: vi.fn(), requireWorkspaceAccess: vi.fn() }));
const context = { getUserId: () => '697806bf-89b2-4ad6-af64-eaf0796a34c4' } as ToolContext;
const args = { workspace_id: '6ee9555c-1dbd-4503-8889-24f97226b202', limit: 20, offset: 0, delivered: undefined };
beforeEach(() => vi.clearAllMocks());
describe('MCP project access', () => {
  it('does not query projects without active workspace access', async () => {
    vi.mocked(requireWorkspaceAccess).mockRejectedValueOnce(new Error('No active membership'));
    await expect(listProjects.handler(args, context)).rejects.toThrow('No active membership');
    expect(supabaseForUser).not.toHaveBeenCalled();
  });
  it('checks projects.view as the verified caller before querying projects', async () => {
    const from = vi.fn();
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({ rpc, from } as unknown as Awaited<ReturnType<typeof requireWorkspaceAccess>>);
    await expect(listProjects.handler(args, context)).rejects.toThrow('Project viewing is not permitted');
    expect(rpc).toHaveBeenCalledWith('has_workspace_permission', { _user_id: context.getUserId(), _workspace_id: args.workspace_id, _permission_key: 'projects.view' });
    expect(from).not.toHaveBeenCalled();
  });
});