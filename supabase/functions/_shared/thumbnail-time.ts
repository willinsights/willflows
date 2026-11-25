// Stream thumbnail time accepts only absolute times (e.g. "12s"); percentages fall back to the black first frame.
export function middleThumbnailTime(duration: unknown): string {
  const d = Number(duration);
  return Number.isFinite(d) && d > 0 ? `${Math.max(1, Math.floor(d / 2))}s` : '1s';
}
