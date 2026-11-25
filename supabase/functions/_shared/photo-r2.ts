// Cloudflare R2 access for photo galleries. Photos live under the dedicated "photos/" prefix
// (or CLOUDFLARE_R2_PHOTOS_BUCKET when configured), separate from video keys.
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.18';
import { XMLParser } from 'npm:fast-xml-parser@4.5.3';

const env = (k: string) => Deno.env.get(k) ?? '';
export const PHOTO_PREFIX = 'photos/';
const bucket = () => env('CLOUDFLARE_R2_PHOTOS_BUCKET') || env('CLOUDFLARE_R2_BUCKET');
const client = () => new AwsClient({ accessKeyId: env('CLOUDFLARE_R2_ACCESS_KEY'), secretAccessKey: env('CLOUDFLARE_R2_SECRET_KEY'), service: 's3', region: 'auto' });
const objectUrl = (key: string) => new URL(`/${bucket()}/${key.split('/').map(encodeURIComponent).join('/')}`, `https://${env('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com`);

export const photoKey = (ws: string, gallery: string, photo: string, kind: 'preview' | 'original', ext: string) =>
  `${PHOTO_PREFIX}${ws}/${gallery}/${photo}/${kind}.${ext}`;

export async function presign(key: string, method: 'GET' | 'PUT', expires: number, opts: { contentType?: string; download?: string } = {}) {
  const url = objectUrl(key);
  url.searchParams.set('X-Amz-Expires', String(expires));
  if (opts.download) url.searchParams.set('response-content-disposition', `attachment; filename="${opts.download.replace(/["\\\r\n]/g, '_')}"`);
  const headers: Record<string, string> = {};
  if (opts.contentType) headers['Content-Type'] = opts.contentType;
  const signed = await client().sign(new Request(url.toString(), { method, headers }), { aws: { signQuery: true } });
  return signed.url.toString();
}

export async function objectSize(key: string): Promise<number | null> {
  const res = await client().fetch(objectUrl(key).toString(), { method: 'HEAD' });
  if (!res.ok) return null;
  return Number(res.headers.get('content-length') ?? 0);
}

export async function deleteObject(key: string) {
  if (!key.startsWith(PHOTO_PREFIX)) throw new Error('Invalid photo key');
  const res = await client().fetch(objectUrl(key).toString(), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Photo storage deletion failed');
}

/** Include unconfirmed uploads after their signed upload tickets have expired. */
export async function listGalleryObjects(ws: string, gallery: string): Promise<string[]> {
  const prefix = `${PHOTO_PREFIX}${ws}/${gallery}/`;
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const url = objectUrl('');
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', prefix);
    if (token) url.searchParams.set('continuation-token', token);
    const res = await client().fetch(url.toString());
    if (!res.ok) throw new Error('Photo storage listing failed');
    const result = new XMLParser({ parseTagValue: false }).parse(await res.text()).ListBucketResult;
    if (!result) throw new Error('Invalid photo storage listing');
    const contents = result.Contents ? (Array.isArray(result.Contents) ? result.Contents : [result.Contents]) : [];
    for (const item of contents) {
      if (typeof item.Key !== 'string' || !item.Key.startsWith(prefix)) throw new Error('Invalid gallery object');
      keys.push(item.Key);
    }
    token = result.IsTruncated === 'true' ? result.NextContinuationToken : undefined;
    if (result.IsTruncated === 'true' && !token) throw new Error('Incomplete photo storage listing');
  } while (token);
  return keys;
}

/** Signed read URL for a stored photo path, whichever store holds it. */
// deno-lint-ignore no-explicit-any
export async function readUrl(db: any, provider: string, path: string, expires: number, download?: string) {
  if (provider === 'r2') return presign(path, 'GET', expires, { download });
  const { data } = await db.storage.from('gallery-photos').createSignedUrl(path, expires, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}
