const PUBLIC_ORIGIN = 'https://willflow.app';

/** Origin for links sent to clients. Preview hosts require a Lovable login, so use the public domain there. */
export function getPublicShareOrigin(): string {
  if (typeof window === 'undefined') return PUBLIC_ORIGIN;
  const host = window.location.hostname;
  const isPreview =
    host.endsWith('lovableproject.com') ||
    host.startsWith('id-preview--') ||
    host === 'localhost' ||
    host === '127.0.0.1';
  return isPreview ? PUBLIC_ORIGIN : window.location.origin;
}
