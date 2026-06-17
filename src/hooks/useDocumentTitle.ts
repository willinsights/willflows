import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { labelFromSegment } from '@/lib/route-labels';

const BRAND = 'WillFlow';

/**
 * Automatically syncs document.title with the current route's last segment.
 * Uses the shared routeLabels map; falls back to a capitalised slug.
 * Format: "Finanças | WillFlow"
 */
export function useDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);

    // Root /app and /app/dashboard → "Dashboard | WillFlow"
    if (segments.length === 0 || pathname === '/app' || pathname === '/app/dashboard') {
      document.title = `Dashboard | ${BRAND}`;
      return;
    }

    const last = segments[segments.length - 1];
    document.title = `${labelFromSegment(last)} | ${BRAND}`;
  }, [pathname]);
}
