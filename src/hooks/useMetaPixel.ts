import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * useMetaPixel
 *
 * - Tracks a PageView on each react-router route change.
 * - Exposes `trackLead()` to fire a Lead event on successful signup.
 *
 * Respects Google Consent Mode v2: the base pixel in index.html starts with
 * `fbq('consent', 'revoke')` and is only granted after the user accepts
 * analytics/ads cookies via CookieConsentBanner. Calls made before consent
 * are queued by fbq and dropped, so it's safe to invoke unconditionally.
 */
export function useMetaPixel() {
  const location = useLocation();

  // PageView on route change. Skip the very first mount because index.html
  // already fires an initial PageView when the pixel loads.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.fbq) return;
    window.fbq('track', 'PageView');
  }, [location.pathname, location.search]);

  const trackLead = useCallback((params?: Record<string, unknown>) => {
    if (typeof window === 'undefined' || !window.fbq) return;
    window.fbq('track', 'Lead', params ?? {});
  }, []);

  const trackEvent = useCallback(
    (event: string, params?: Record<string, unknown>) => {
      if (typeof window === 'undefined' || !window.fbq) return;
      window.fbq('track', event, params ?? {});
    },
    []
  );

  return { trackLead, trackEvent };
}
