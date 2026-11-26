import { defineTool, ToolError } from '@lovable.dev/mcp-js';
import { z } from 'zod';
import { requireWorkspaceAccess } from '../supabase';

export default defineTool({
  name: 'list_projects',
  title: 'List studio projects',
  description: 'Read a bounded page of project names, codes and dates in an authorized studio, without financial or client contact data.',
  inputSchema: {
    workspace_id: z.string().uuid().describe('Studio ID returned by list_workspaces.'),
    delivered: z.boolean().optional().describe('Filter to delivered projects when true or active projects when false.'),
    limit: z.number().int().min(1).max(50).default(20).describe('Maximum number of projects, from 1 to 50.'),
    offset: z.number().int().min(0).max(10000).default(0).describe('Pagination offset, from 0 to 10000.'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, delivered, limit, offset }, ctx) => {
    const db = await requireWorkspaceAccess(ctx, workspace_id);
    const { data: permitted, error: permissionError } = await db.rpc('has_workspace_permission', { _user_id: ctx.getUserId(), _workspace_id: workspace_id, _permission_key: 'projects.view' });
    if (permissionError || !permitted) throw new ToolError('Project viewing is not permitted for this account');
    let query = db.from('projects').select('id,name,project_code,type,is_delivered,shoot_date,delivery_date,delivered_at').eq('workspace_id', workspace_id);
    if (delivered !== undefined) query = query.eq('is_delivered', delivered);
    const { data, error } = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1);
    if (error) throw new ToolError('Unable to read projects');
    const projects = (data ?? []).map(row => ({ id: String(row.id), name: String(row.name), project_code: row.project_code as string | null, type: String(row.type), is_delivered: Boolean(row.is_delivered), shoot_date: row.shoot_date as string | null, delivery_date: row.delivery_date as string | null, delivered_at: row.delivered_at as string | null }));
    return { content: [{ type: 'text', text: JSON.stringify(projects) }], structuredContent: { projects, offset, limit } };
  },
});