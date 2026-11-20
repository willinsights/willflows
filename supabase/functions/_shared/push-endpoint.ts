// Allowlist of browser push services shared by the push edge functions.
// Notifications are only delivered to well-known browser push services,
// never to arbitrary hosts. Keep this list restrictive: https only, default
// port, no embedded credentials, hostname matched by anchored patterns.

const TRUSTED_PUSH_HOSTS: RegExp[] = [
  // Chrome, Edge (Chromium), Android and other Chromium browsers (FCM).
  /^fcm\.googleapis\.com$/,
  // Legacy GCM endpoint still present in old Chromium subscriptions.
  /^android\.googleapis\.com$/,
  // Alternative FCM web push host handed out by Chrome to some clients.
  /^jmt17\.google\.com$/,
  // Firefox (Mozilla autopush).
  /(^|\.)push\.services\.mozilla\.com$/,
  // Windows Push Notification Services (legacy Edge and Windows clients).
  /(^|\.)notify\.windows\.com$/,
  // Safari on macOS, iOS and iPadOS (web.push.apple.com and regional hosts).
  /(^|\.)push\.apple\.com$/,
];

export function isTrustedPushEndpoint(endpoint: unknown): boolean {
  if (typeof endpoint !== 'string' || !endpoint) return false;
  try {
    const u = new URL(endpoint);
    return (
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
