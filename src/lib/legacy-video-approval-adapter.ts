import { middleThumbnailTime } from '@/lib/thumbnail-time';
import { fileStem } from '@/lib/video-deliverables';
import { rememberReviewCommentKey } from '@/lib/review-comment-keys';

const DELETE_KEYS = 'willflow_comment_delete_keys';
const publicApiHeaders = {
  'Content-Type': 'application/json',
  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
};

type LegacyVersion = {
  id: string;
  file_name: string;
  created_at: string;
  duration_seconds: number | null;
};

type LegacyComment = {
  id: string;
  video_version_id: string;
  timestamp_seconds: number;
  body: string;
  status: 'open' | 'resolved';
  is_client_comment: boolean;
  client_name: string | null;
  parent_id: string | null;
  resolved_at: string | null;
  edited_at?: string | null;
  created_at: string;
};

type LegacyApprovalData = {
  branding?: { name: string; logo_url: string | null };
  task: { title: string; project_name: string };
  versions: LegacyVersion[];
  comments: LegacyComment[];
  approval: null | {
    approved_at: string;
    client_name: string | null;
    notes: string | null;
    video_version_id?: string | null;
  };
  signed_urls: Record<string, string>;
};

function readDeleteKeys(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETE_KEYS) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeDeleteKeys(keys: Record<string, string>) {
  try { localStorage.setItem(DELETE_KEYS, JSON.stringify(keys)); } catch { /* optional local capability */ }
}

async function legacyFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    ...init,
    headers: { ...publicApiHeaders, ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a revisão.');
  return data;
}

async function approvalData(token: string): Promise<LegacyApprovalData> {
  return legacyFetch(`get-video-approval-data?token=${encodeURIComponent(token)}`);
}

function thumbnail(url: string, duration: number | null): string | undefined {
  const match = url.match(/videodelivery\.net\/([a-f0-9]+)/i);
  return match ? `https://videodelivery.net/${match[1]}/thumbnails/thumbnail.jpg?time=${middleThumbnailTime(duration)}` : undefined;
}

async function withLocalCapabilities(comments: LegacyComment[]) {
  const deleteKeys = readDeleteKeys();
  return Promise.all(comments.map(async comment => {
    const secret = deleteKeys[comment.id];
    if (!secret) return {
      id: comment.id,
      body: comment.body,
      client_name: comment.client_name || (comment.is_client_comment ? 'Cliente' : 'Equipa'),
      timestamp_seconds: Number(comment.timestamp_seconds) || 0,
      parent_id: comment.parent_id,
      resolved_at: comment.status === 'resolved' ? comment.resolved_at || comment.created_at : null,
      edited_at: comment.edited_at ?? null,
      from_team: !comment.is_client_comment,
      key: null,
    };
    const key = await rememberReviewCommentKey(secret);
    return {
      id: comment.id,
      body: comment.body,
      client_name: comment.client_name || 'Cliente',
      timestamp_seconds: Number(comment.timestamp_seconds) || 0,
      parent_id: comment.parent_id,
      resolved_at: comment.status === 'resolved' ? comment.resolved_at || comment.created_at : null,
      edited_at: comment.edited_at ?? null,
      from_team: !comment.is_client_comment,
      key,
    };
  }));
}

async function read(data: LegacyApprovalData, versionId: string) {
  const version = data.versions.find(item => item.id === versionId);
  if (!version) throw new Error('Versão não encontrada.');
  const approval = data.approval?.video_version_id === versionId ? data.approval : null;
  const sibling = data.approval && !approval ? data.approval : null;
  const url = data.signed_urls[versionId];
  return {
    version: { id: version.id, file_name: version.file_name },
    comments: await withLocalCapabilities(data.comments.filter(comment => comment.video_version_id === versionId)),
    approval: approval ? {
      client_name: approval.client_name || 'Cliente',
      notes: approval.notes || '',
      approved_at: approval.approved_at,
    } : null,
    group_approval: sibling?.video_version_id ? {
      version_id: sibling.video_version_id,
      name: sibling.client_name || 'Cliente',
      approved_at: sibling.approved_at,
    } : null,
    playback: url ? { url, thumbnail: thumbnail(url, version.duration_seconds), expiresAt: Math.floor(Date.now() / 1000) + 600 } : null,
    branding: data.branding ?? null,
  };
}

/** Preserves legacy token authorization while rendering the canonical Review Studio. */
export async function legacyVideoApprovalRequest(body: Record<string, unknown>) {
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token || token.startsWith('wf2_')) throw new Error('Link de revisão inválido.');

  if (body.action === 'list') {
    const data = await approvalData(token);
    const label = data.task.title || fileStem(data.versions[0]?.file_name || 'Vídeo');
    return { versions: data.versions.map(version => ({ id: version.id, file_name: version.file_name, created_at: version.created_at, label })) };
  }

  if (body.action === 'read' && typeof body.versionId === 'string') {
    return read(await approvalData(token), body.versionId);
  }

  if ((body.action === 'comment' || body.action === 'approval') && typeof body.versionId === 'string') {
    const result = await legacyFetch('submit-video-feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: body.action,
        token,
        video_version_id: body.versionId,
        timestamp_seconds: body.timestamp ?? 0,
        body: body.body,
        notes: body.action === 'approval' ? body.body : undefined,
        client_name: body.name,
      }),
    });
    if (body.action === 'comment' && result.comment?.id && typeof result.delete_key === 'string') {
      writeDeleteKeys({ ...readDeleteKeys(), [result.comment.id]: result.delete_key });
    }
    return { success: true };
  }

  if ((body.action === 'comment-edit' || body.action === 'comment-delete') && typeof body.commentId === 'string') {
    const deleting = body.action === 'comment-delete';
    const result = await legacyFetch('delete-video-comment', {
      method: 'POST',
      body: JSON.stringify({
        operation: deleting ? 'delete' : 'edit',
        token,
        comment_id: body.commentId,
        client_name: body.clientName,
        delete_key: body.requestId,
        body: deleting ? undefined : body.body,
      }),
    });
    if (deleting) {
      const keys = readDeleteKeys();
      delete keys[body.commentId];
      writeDeleteKeys(keys);
    }
    return result;
  }

  throw new Error('Operação não suportada neste link de revisão.');
}
