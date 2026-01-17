import { usePageTracking } from '@/hooks/usePageTracking';

// Component to add page tracking to the app
export function PageTrackingProvider({ children }: { children: React.ReactNode }) {
  usePageTracking();
  return <>{children}</>;
}
