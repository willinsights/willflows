/**
 * S19: short-lived (10 min) Storage links expire while a video is open.
 * The player asks for a fresh link automatically, at most once per link,
 * and resumes at the same position. Further failures show the manual button.
 */
export function createUrlRenewalGuard() {
  const renewed = new Set<string>();
  return {
    shouldRenew(url: string | null | undefined): boolean {
      if (!url || renewed.has(url)) return false;
      renewed.add(url);
      return true;
    },
  };
}

/** Storage-signed links are the only ones that expire; Stream/HLS links do not. */
export function isExpiringStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\/storage\/v1\/object\/sign\//.test(url) && /[?&]token=/.test(url);
}
