import { usePageTracking } from '@/hooks/usePageTracking';
import { useMetaPixel } from '@/hooks/useMetaPixel';

// Component to add page tracking to the app
export function PageTrackingProvider({ children }: { children: React.ReactNode }) {
  usePageTracking();
  useMetaPixel();
  return <>{children}</>;
}
