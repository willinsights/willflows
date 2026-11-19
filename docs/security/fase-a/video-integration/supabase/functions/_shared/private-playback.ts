import { activeVideoToken, isUuid, resolveVideoContext, tokenCoversVersion, VideoContextError } from './video-context.ts';

export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', 'Pragma': 'no-cache', 'Vary': 'Authorization' };
export type PlaybackSigner = (uid: string) => Promise<{ url: string; thumbnail: string; expiresAt: number }>;

// Call only after scoped authorization. Credentials and provider errors never reach callers.
export function providerPlayback(account: string, credential: string, request: typeof fetch = fetch): PlaybackSigner {
  return async uid => {
    if (!/^[a-f0-9]{32}$/i.test(uid)) throw new Error('INVALID_STREAM_ID');
    const expiresAt = Math.floor(Date.now() / 1000) + 900;
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/${uid}/token`, {
      method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ exp: expiresAt }),
    });
    if (!response.ok) throw new Error('PLAYBACK_SIGNING_UNCONFIRMED');
    const data = await response.json();
    const token = data?.result?.token;
    if (data.success !== true || typeof token !== 'string' || !/^[A-Za-z0-9._-]+$/.test(token)) throw new Error('PLAYBACK_SIGNING_UNCONFIRMED');
    return { url: `https://videodelivery.net/${token}/manifest/video.m3u8`, thumbnail: `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=50p`, expiresAt };
  };
}

export async function authorizedPlayback(db: any, input: { versionId: unknown; replacement?: boolean; approvalToken?: string }, userId: string | null, sign: PlaybackSigner) {
  if (!isUuid(input.versionId)) throw new VideoContextError('Invalid version');
  const { data: version, error } = await db.from('video_versions').select('*').eq('id', input.versionId).maybeSingle();
  if (error || !version || version.is_deleted === true) throw new VideoContextError('Invalid version');
  const context = await resolveVideoContext(db, version);
  if (input.approvalToken) {
    const result = await db.from('video_approval_tokens').select('*').eq('token', input.approvalToken).maybeSingle();
    if (result.error || !result.data || !activeVideoToken(result.data) || !tokenCoversVersion(await resolveVideoContext(db, result.data), context)) throw new VideoContextError('Invalid link');
  } else {
    if (!userId) throw new VideoContextError('Authentication required');
    const result = await db.from('workspace_members').select('is_active').eq('workspace_id', context.workspace_id).eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (result.error || !result.data) throw new VideoContextError('Forbidden');
  }
  const uid = input.replacement ? version.replacement_stream_uid : version.cloudflare_stream_uid;
  if (!uid) return { url: null, thumbnail: null, expiresAt: null }; // Legacy Storage retains its existing scoped signer.
  const playback = await sign(uid);
  // Recheck after provider I/O: revoked links, membership and superseded versions cannot release a token.
  const latest = await db.from('video_versions').select('*').eq('id', version.id).maybeSingle();
  if (latest.error || !latest.data || latest.data.is_deleted === true || (input.replacement ? latest.data.replacement_stream_uid : latest.data.cloudflare_stream_uid) !== uid || !tokenCoversVersion(context, await resolveVideoContext(db, latest.data))) throw new VideoContextError('Version superseded');
  if (input.approvalToken) {
    const latestToken = await db.from('video_approval_tokens').select('*').eq('token', input.approvalToken).maybeSingle();
    if (latestToken.error || !latestToken.data || !activeVideoToken(latestToken.data) || !tokenCoversVersion(await resolveVideoContext(db, latestToken.data), context)) throw new VideoContextError('Link revoked');
  } else {
    const membership = await db.from('workspace_members').select('is_active').eq('workspace_id', context.workspace_id).eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (membership.error || !membership.data) throw new VideoContextError('Membership revoked');
  }
  return playback;
}