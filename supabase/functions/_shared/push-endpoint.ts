// Allowlist of browser push services shared by the push edge functions.
// Notifications are only delivered to well-known browser push services,
// never to arbitrary hosts. Keep this list restrictive: https only, default
// port, no embedded credentials, no fragment, hostname matched by anchored
// patterns, and the endpoint must already be in canonical (normalised) form.

const TRUSTED_PUSH_HOSTS: RegExp[] = [
  // Chrome, Edge (Chromium), Android and other Chromium browsers (FCM).
  /^fcm\.googleapis\.com$/,
  // Legacy GCM endpoint still present in old Chromium subscriptions.
  /^android\.googleapis\.com$/,
  // Firefox (Mozilla autopush).
  /(^|\.)push\.services\.mozilla\.com$/,
  // Windows Push Notification Services (legacy Edge and Windows clients).
  /(^|\.)notify\.windows\.com$/,
  // Safari on macOS, iOS and iPadOS (web.push.apple.com and regional hosts).
  /(^|\.)push\.apple\.com$/,
];

export function isTrustedPushEndpoint(endpoint: unknown): boolean {
  if (typeof endpoint !== 'string' || !endpoint) return false;
  // Checked on the raw string: an empty fragment ("...#") leaves u.hash empty.
  if (endpoint.includes('#')) return false;
  try {
    const u = new URL(endpoint);
    return (
      // Canonical form only. The original string is later parsed again by the
      // push library, so anything this parser would have to normalise (case,
      // backslashes, whitespace, dot segments, default port, ...) is refused
      // instead of relying on two parsers agreeing. Browsers emit endpoints
      // already normalised; percent-encoding is preserved by serialisation.
      u.href === endpoint &&
      u.protocol === 'https:' &&
      !u.port &&
      !u.username &&
      !u.password &&
      TRUSTED_PUSH_HOSTS.some((re) => re.test(u.hostname))
    );
  } catch {
    return false;
  }
}

// Hostname only, for logs. Never log the full endpoint: its path is a
// per-device capability.
export function pushEndpointHostForLog(endpoint: unknown): string {
  if (typeof endpoint !== 'string') return 'invalid';
  try {
    return new URL(endpoint).hostname.slice(0, 100) || 'invalid';
  } catch {
    return 'invalid';
  }
}
