import { defineTool, ToolError } from '@lovable.dev/mcp-js';
import { supabaseForUser } from '../supabase';

export default defineTool({
  name: 'list_workspaces',
  title: 'List my studios',
  description: 'List up to 50 studios where the authenticated caller is an active member.',
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const db = supabaseForUser(ctx);
    const { data: memberships, error } = await db.from('workspace_members').select('workspace_id').eq('user_id', ctx.getUserId()).eq('is_active', true).limit(50);
    if (error) throw new ToolError('Unable to read studio memberships');
    const ids = (memberships ?? []).map(row => row.workspace_id);
    if (!ids.length) return { content: [{ type: 'text', text: 'No active studios.' }], structuredContent: { workspaces: [] } };
    const { data, error: readError } = await db.from('workspaces').select('id,name').in('id', ids).order('name').limit(50);
    if (readError) throw new ToolError('Unable to read studios');
    const workspaces = (data ?? []).map(row => ({ id: String(row.id), name: String(row.name) }));
    return { content: [{ type: 'text', text: JSON.stringify(workspaces) }], structuredContent: { workspaces } };
  },
});