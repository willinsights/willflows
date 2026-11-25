export interface ExtrasSummary { favorites: number; included: number; extras: number; amount: number }

/** Favorites beyond the included count become paid extras. included=0 means no limit (no extras). */
export function computeExtras(favorites: number, included: number, extraPrice: number): ExtrasSummary {
  const fav = Math.max(0, Math.floor(favorites));
  const inc = Math.max(0, Math.floor(included));
  const extras = inc === 0 ? 0 : Math.max(0, fav - inc);
  const amount = Math.round(extras * Math.max(0, extraPrice) * 100) / 100;
  return { favorites: fav, included: inc, extras, amount };
}

export function isGalleryLinkExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now.getTime();
}

/** Clamp a click position to a 0–100 percentage point within the photo. */
export function toPercentPoint(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v * 1000) / 1000));
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 100),
    y: clamp(((clientY - rect.top) / rect.height) * 100),
  };
}

/** Builds a downscaled JPEG preview, optionally with a tiled watermark. Browser only. */
export async function buildPreview(file: File, opts: { maxSize?: number; watermark?: string | null } = {}) {
  const maxSize = opts.maxSize ?? 2000;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (opts.watermark) {
    const size = Math.max(18, Math.round(w / 22));
    ctx.save();
    ctx.font = `600 ${size}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    const step = size * 6;
    for (let y = -h; y < h; y += step) {
      for (let x = -w; x < w; x += step * 1.6) {
        ctx.fillText(opts.watermark, x, y);
        ctx.strokeText(opts.watermark, x, y);
      }
    }
    ctx.restore();
  }
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('preview'))), 'image/jpeg', 0.85));
  return { blob, width: bitmap.width, height: bitmap.height };
}
